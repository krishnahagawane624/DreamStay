const Booking = require("../models/booking");
const Listing = require("../models/listing");
const Notification = require("../models/notification");
const PDFDocument = require("pdfkit");
const razorpay = require("../util/razorpay");

const {
    sendBookingConfirmationEmail,
    sendNewBookingHostEmail,
    sendCancellationEmail,
} = require("../util/mailer");


// =====================================================
// PRICE BREAKDOWN
// =====================================================

function getBreakdown(booking) {

    const serviceFee =
        booking.serviceFee ??
        Math.round((booking.totalPrice || 0) * 0.10);

    const gstRate = booking.gstRate ?? 0;

    const gstAmount = booking.gstAmount ?? 0;

    const grandTotal =
        booking.grandTotal ??
        ((booking.totalPrice || 0) + serviceFee + gstAmount);

    return {
        serviceFee,
        gstRate,
        gstAmount,
        grandTotal,
    };
}


// =====================================================
// CREATE BOOKING
// POST /listings/:id/bookings
// =====================================================

module.exports.createBooking = async (req, res) => {

    const { id } = req.params;

    const bookingData = req.body.booking || {};

    const {
        checkIn,
        checkOut,
        guests,
    } = bookingData;

    const {
        paymentId,
        orderId,
    } = req.body;


    // =================================================
    // BASIC VALIDATION
    // =================================================

    if (!checkIn || !checkOut || !guests) {

      
        req.flash(
            "error",
            "Incomplete booking details."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // PAYMENT DATA VALIDATION
    // =================================================

    if (!paymentId || !orderId) {

        req.flash(
            "error",
            "Payment information is missing."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // FIND LISTING
    // =================================================

    const listing = await Listing
        .findById(id)
        .populate("owner");

    if (!listing) {

        req.flash(
            "error",
            "Listing not found!"
        );

        return res.redirect("/listings");
    }


    // =================================================
    // DATE VALIDATION
    // =================================================

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const numberOfGuests = Number(guests);


    if (
        Number.isNaN(checkInDate.getTime()) ||
        Number.isNaN(checkOutDate.getTime())
    ) {

        req.flash(
            "error",
            "Invalid booking dates."
        );

        return res.redirect(`/listings/${id}`);
    }


    if (checkOutDate <= checkInDate) {

        req.flash(
            "error",
            "Check-out date must be after check-in date."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // PREVENT PAST BOOKINGS
    // =================================================

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const bookingCheckIn = new Date(checkInDate);

    bookingCheckIn.setHours(0, 0, 0, 0);


    if (bookingCheckIn < today) {

        req.flash(
            "error",
            "Check-in date cannot be in the past."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // GUEST VALIDATION
    // =================================================

    if (
        !Number.isInteger(numberOfGuests) ||
        numberOfGuests <= 0
    ) {

        req.flash(
            "error",
            "Invalid number of guests."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // CALCULATE NIGHTS
    // =================================================

    const millisecondsPerDay =
        1000 * 60 * 60 * 24;

    const nights = Math.ceil(
        (checkOutDate - checkInDate) /
        millisecondsPerDay
    );


    if (nights <= 0) {

        req.flash(
            "error",
            "Invalid number of nights."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // CALCULATE PRICE ON SERVER
    // =================================================

    const totalPrice =
        Number(listing.price) * nights;


    const serviceFee =
        Math.round(totalPrice * 0.10);


    // GST is currently disabled
    const gstRate = 0;
    const gstAmount = 0;


    const grandTotal =
        totalPrice +
        serviceFee +
        gstAmount;


    // =================================================
    // CHECK DATE AVAILABILITY
    // =================================================

    const available =
        await isListingAvailable(
            id,
            checkInDate,
            checkOutDate
        );


    if (!available) {

        req.flash(
            "error",
            "These dates are already booked. Please select different dates."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // VERIFY RAZORPAY ORDER
    // =================================================

    try {

        const razorpayOrder =
            await razorpay.orders.fetch(orderId);


        const expectedAmount =
            Math.round(grandTotal * 100);


        if (
            razorpayOrder.amount !== expectedAmount ||
            razorpayOrder.currency !== "INR"
        ) {

            req.flash(
                "error",
                "Payment amount does not match the booking amount."
            );

            return res.redirect(`/listings/${id}`);
        }


        // Make sure the order belongs to the expected payment
        if (
            razorpayOrder.status === "created"
        ) {

            req.flash(
                "error",
                "Payment has not been completed."
            );

            return res.redirect(`/listings/${id}`);
        }

    } catch (error) {

        console.error(
            "Razorpay order verification error:",
            error
        );

        req.flash(
            "error",
            "Unable to verify payment order."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // PREVENT DUPLICATE PAYMENT / ORDER
    // =================================================

    const existingPayment =
        await Booking.findOne({
            $or: [
                { paymentId },
                { orderId },
            ],
        });


    if (existingPayment) {

        req.flash(
            "error",
            "This payment has already been used."
        );

        return res.redirect(`/listings/${id}`);
    }


    // =================================================
    // CREATE BOOKING
    // =================================================

    const booking = new Booking({

        listing: id,

        user: req.user._id,

        checkIn: checkInDate,

        checkOut: checkOutDate,

        guests: numberOfGuests,

        totalPrice,

        serviceFee,

        gstRate,

        gstAmount,

        grandTotal,

        paymentId,

        orderId,

        paymentStatus: "Paid",

        status: "confirmed",
    });


    await booking.save();


    // =================================================
    // NOTIFY HOST
    // =================================================

    if (listing.owner) {

        await Notification.create({

            user: listing.owner._id,

            type: "booking",

            message:
                `New booking for "${listing.title}" (${nights} night${nights > 1 ? "s" : ""})`,

            link:
                `/listings/${listing._id}/bookings/${booking._id}`,
        });
    }


    // =================================================
    // SEND EMAILS
    // =================================================

    try {

        if (req.user.email) {

            await sendBookingConfirmationEmail(

                req.user.email,

                req.user.username,

                {
                    listingTitle: listing.title,

                    checkIn,

                    checkOut,

                    guests: numberOfGuests,

                    grandTotal: booking.grandTotal,
                }
            );
        }


        if (
            listing.owner &&
            listing.owner.email
        ) {

            await sendNewBookingHostEmail(

                listing.owner.email,

                listing.owner.username,

                {
                    listingTitle: listing.title,

                    guestUsername:
                        req.user.username,

                    checkIn,

                    checkOut,

                    grandTotal:
                        booking.grandTotal,
                }
            );
        }

    } catch (error) {

        console.error(
            "Booking email error:",
            error.message
        );
    }


    // =================================================
    // SUCCESS
    // =================================================

    req.flash(
        "success",
        "Booking Confirmed!"
    );


    return res.redirect(
        `/listings/${id}/bookings/success/${booking._id}`
    );
};


// =====================================================
// CHECK DATE AVAILABILITY
// =====================================================

async function isListingAvailable(
    listingId,
    checkIn,
    checkOut
) {

    const existingBooking =
        await Booking.findOne({

            listing: listingId,

            status: "confirmed",

            checkIn: {
                $lt: checkOut,
            },

            checkOut: {
                $gt: checkIn,
            },
        });


    return !existingBooking;
}


// =====================================================
// BOOKING SUCCESS PAGE
// GET /listings/:id/bookings/success/:bookingId
// =====================================================

module.exports.bookingSuccess = async (
    req,
    res
) => {

    const { bookingId } = req.params;


    const booking =
        await Booking.findById(bookingId)
            .populate("listing")
            .populate("user");


    if (!booking) {

        req.flash(
            "error",
            "Booking not found!"
        );

        return res.redirect("/bookings");
    }


    // Only the booking user can see success page
    if (
        !booking.user ||
        !booking.user._id.equals(req.user._id)
    ) {

        req.flash(
            "error",
            "You are not authorized to view this booking."
        );

        return res.redirect("/bookings");
    }


    const breakdown =
        getBreakdown(booking);


    res.render(
        "bookings/success.ejs",
        {
            booking,
            breakdown,
        }
    );
};


// =====================================================
// BOOKING DETAILS
// GET /listings/:id/bookings/:bookingId
// =====================================================

module.exports.bookingDetails = async (
    req,
    res
) => {

    const { bookingId } = req.params;


    const booking =
        await Booking.findById(bookingId)

            .populate({
                path: "listing",

                populate: {
                    path: "owner",
                },
            })

            .populate("user");


    if (!booking) {

        req.flash(
            "error",
            "Booking not found!"
        );

        return res.redirect("/bookings");
    }


    if (!booking.user) {

        req.flash(
            "error",
            "Invalid booking user."
        );

        return res.redirect("/bookings");
    }


    if (!booking.listing) {

        req.flash(
            "error",
            "The listing associated with this booking no longer exists."
        );

        return res.redirect("/bookings");
    }


    const isGuest =
        booking.user._id.equals(
            req.user._id
        );


    const isHost =
        booking.listing.owner &&
        booking.listing.owner._id.equals(
            req.user._id
        );


    if (!isGuest && !isHost) {

        req.flash(
            "error",
            "You are not authorized to view this booking."
        );

        return res.redirect("/bookings");
    }


    const nights = Math.ceil(

        (
            booking.checkOut -
            booking.checkIn
        ) /
        (1000 * 60 * 60 * 24)

    );


    const breakdown =
        getBreakdown(booking);


    res.render(
        "bookings/details.ejs",
        {
            booking,
            nights,
            breakdown,
        }
    );
};


// =====================================================
// DOWNLOAD INVOICE
// GET /listings/:id/bookings/:bookingId/invoice
// =====================================================

module.exports.downloadInvoice = async (
    req,
    res
) => {

    const { bookingId } = req.params;


    const booking =
        await Booking.findById(bookingId)

            .populate({
                path: "listing",

                populate: {
                    path: "owner",
                },
            })

            .populate("user");


    if (!booking) {

        req.flash(
            "error",
            "Booking not found!"
        );

        return res.redirect("/bookings");
    }


    if (!booking.user) {

        req.flash(
            "error",
            "Invalid booking user."
        );

        return res.redirect("/bookings");
    }


    if (!booking.listing) {

        req.flash(
            "error",
            "Listing not found."
        );

        return res.redirect("/bookings");
    }


    // Only guest can download invoice
    if (
        !booking.user._id.equals(
            req.user._id
        )
    ) {

        req.flash(
            "error",
            "You are not authorized to view this invoice."
        );

        return res.redirect("/bookings");
    }


    const nights = Math.ceil(

        (
            booking.checkOut -
            booking.checkIn
        ) /
        (1000 * 60 * 60 * 24)

    );


    const {
        serviceFee,
        gstRate,
        gstAmount,
        grandTotal,
    } = getBreakdown(booking);


    const cgst =
        Math.round(gstAmount / 2);


    const sgst =
        gstAmount - cgst;


    const taxableValue =
        booking.totalPrice + serviceFee;


    const invoiceNumber =
        `DS-${booking._id
            .toString()
            .slice(-8)
            .toUpperCase()}`;


    const doc =
        new PDFDocument({
            margin: 0,
            size: "A4",
        });


    res.setHeader(
        "Content-Type",
        "application/pdf"
    );


    res.setHeader(
        "Content-Disposition",
        `attachment; filename=DreamStay_Invoice_${invoiceNumber}.pdf`
    );


    doc.pipe(res);


    const pageWidth =
        doc.page.width;


    const margin = 50;


    const contentWidth =
        pageWidth -
        margin * 2;


    // =================================================
    // HEADER
    // =================================================

    doc
        .rect(
            0,
            0,
            pageWidth,
            110
        )
        .fill("#D85A30");


    doc
        .fillColor("#ffffff")
        .fontSize(26)
        .font("Helvetica-Bold")
        .text(
            "DreamStay",
            margin,
            32
        );


    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#fce8e0")
        .text(
            "Property Bookings & Stays",
            margin,
            64
        )
        .text(
            "GSTIN: 27ABCDE1234F1Z5 (sample) | support@dreamstay.com",
            margin,
            78
        );


    doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text(
            "TAX INVOICE",
            margin,
            32,
            {
                width: contentWidth,
                align: "right",
            }
        );


    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#fce8e0")
        .text(
            `Invoice No: ${invoiceNumber}`,
            margin,
            62,
            {
                width: contentWidth,
                align: "right",
            }
        )
        .text(
            `Date: ${new Date().toLocaleDateString("en-IN")}`,
            margin,
            76,
            {
                width: contentWidth,
                align: "right",
            }
        );


    let y = 140;


    // =================================================
    // BILLED BY / TO
    // =================================================

    const colWidth =
        contentWidth / 2 - 10;


    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#D85A30")
        .text(
            "BILLED BY (HOST)",
            margin,
            y
        );


    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#D85A30")
        .text(
            "BILLED TO (GUEST)",
            margin + colWidth + 20,
            y
        );


    y += 16;


    doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(
            booking.listing.owner
                ? booking.listing.owner.username
                : "DreamStay Host",
            margin,
            y,
            {
                width: colWidth,
            }
        );


    doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(
            booking.user.username || "Guest",
            margin + colWidth + 20,
            y,
            {
                width: colWidth,
            }
        );


    y += 15;


    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#555555")
        .text(
            booking.listing.owner
                ? booking.listing.owner.email || "N/A"
                : "N/A",
            margin,
            y,
            {
                width: colWidth,
            }
        );


    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#555555")
        .text(
            booking.user.email || "N/A",
            margin + colWidth + 20,
            y,
            {
                width: colWidth,
            }
        );


    y += 40;


    doc
        .moveTo(margin, y)
        .lineTo(
            pageWidth - margin,
            y
        )
        .strokeColor("#e0e0e0")
        .stroke();


    y += 20;


    // =================================================
    // STAY DETAILS
    // =================================================

    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#D85A30")
        .text(
            "STAY DETAILS",
            margin,
            y
        );


    y += 16;


    function detailLine(
        label,
        value,
        yPos
    ) {

        doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("#777777")
            .text(
                label,
                margin,
                yPos,
                {
                    width: 130,
                }
            );


        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor("#000000")
            .text(
                String(value ?? "N/A"),
                margin + 130,
                yPos
            );
    }


    detailLine(
        "Property",
        booking.listing.title,
        y
    );

    y += 15;


    detailLine(
        "Location",
        `${booking.listing.location || ""}, ${booking.listing.country || ""}`,
        y
    );

    y += 15;


    detailLine(
        "Check-In",
        booking.checkIn.toDateString(),
        y
    );

    y += 15;


    detailLine(
        "Check-Out",
        booking.checkOut.toDateString(),
        y
    );

    y += 15;


    detailLine(
        "Nights",
        nights,
        y
    );

    y += 15;


    detailLine(
        "Guests",
        booking.guests,
        y
    );

    y += 15;


    detailLine(
        "Booking ID",
        booking._id.toString(),
        y
    );


    y += 30;


    // =================================================
    // ITEMIZED TABLE
    // =================================================

    const tableX =
        margin;


    const tableWidth =
        contentWidth;


    const descColWidth =
        tableWidth * 0.70;


    const amtColWidth =
        tableWidth - descColWidth;


    doc
        .rect(
            tableX,
            y,
            tableWidth,
            24
        )
        .fill("#f8f4f1");


    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#333333")
        .text(
            "DESCRIPTION",
            tableX + 10,
            y + 7
        )
        .text(
            "AMOUNT (INR)",
            tableX + descColWidth,
            y + 7,
            {
                width: amtColWidth - 10,
                align: "right",
            }
        );


    y += 24;


    function tableRow(
        label,
        value,
        bold = false,
        shade = false
    ) {

        if (shade) {

            doc
                .rect(
                    tableX,
                    y,
                    tableWidth,
                    22
                )
                .fill("#fbfbfb");
        }


        doc
            .fontSize(9)
            .font(
                bold
                    ? "Helvetica-Bold"
                    : "Helvetica"
            )
            .fillColor("#000000")
            .text(
                label,
                tableX + 10,
                y + 6,
                {
                    width:
                        descColWidth - 15,
                }
            )
            .text(
                value,
                tableX + descColWidth,
                y + 6,
                {
                    width:
                        amtColWidth - 10,
                    align: "right",
                }
            );


        y += 22;
    }


    tableRow(
        `Room Charges (Rs. ${Number(
            booking.listing.price || 0
        ).toLocaleString("en-IN")} x ${nights} night${nights > 1 ? "s" : ""})`,
        `Rs. ${Number(
            booking.totalPrice || 0
        ).toLocaleString("en-IN")}`,
        false,
        true
    );


    tableRow(
        "Service Fee",
        `Rs. ${Number(
            serviceFee
        ).toLocaleString("en-IN")}`
    );


    if (gstAmount > 0) {

        tableRow(
            `CGST @ ${(
                (gstRate * 100) / 2
            ).toFixed(1)}% (on Rs. ${taxableValue.toLocaleString("en-IN")})`,
            `Rs. ${cgst.toLocaleString("en-IN")}`,
            false,
            true
        );


        tableRow(
            `SGST @ ${(
                (gstRate * 100) / 2
            ).toFixed(1)}% (on Rs. ${taxableValue.toLocaleString("en-IN")})`,
            `Rs. ${sgst.toLocaleString("en-IN")}`
        );

    } else {

        tableRow(
            "GST",
            "Not Applicable",
            false,
            true
        );
    }


    const tableHeight =
        gstAmount > 0
            ? 88
            : 66;


    doc
        .rect(
            tableX,
            y - tableHeight,
            tableWidth,
            tableHeight
        )
        .strokeColor("#e0e0e0")
        .stroke();


    y += 6;


    // =================================================
    // GRAND TOTAL
    // =================================================

    doc
        .rect(
            tableX,
            y,
            tableWidth,
            32
        )
        .fill("#212529");


    doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text(
            "TOTAL PAID",
            tableX + 10,
            y + 9
        )
        .text(
            `Rs. ${grandTotal.toLocaleString("en-IN")}`,
            tableX + descColWidth,
            y + 9,
            {
                width:
                    amtColWidth - 10,
                align: "right",
            }
        );


    y += 55;


    // =================================================
    // PAYMENT INFORMATION
    // =================================================

    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#D85A30")
        .text(
            "PAYMENT INFORMATION",
            tableX,
            y
        );


    y += 16;


    detailLine(
        "Payment Status",
        booking.paymentStatus,
        y
    );

    y += 15;


    detailLine(
        "Payment ID",
        booking.paymentId,
        y
    );

    y += 15;


    detailLine(
        "Order ID",
        booking.orderId || "N/A",
        y
    );

    y += 15;


    detailLine(
        "Booking Status",
        booking.status
            ? booking.status
                .charAt(0)
                .toUpperCase() +
              booking.status.slice(1)
            : "N/A",
        y
    );


    y += 40;


    // =================================================
    // FOOTER
    // =================================================

    doc
        .moveTo(margin, y)
        .lineTo(
            pageWidth - margin,
            y
        )
        .strokeColor("#e0e0e0")
        .stroke();


    y += 15;


    doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#999999")
        .text(
            "This is a system-generated invoice and does not require a physical signature. " +
            "GSTIN and tax details shown are for demonstration purposes. " +
            "For queries regarding this booking, contact support@dreamstay.com.",
            margin,
            y,
            {
                width: contentWidth,
                align: "center",
            }
        );


    doc.end();
};


// =====================================================
// MY BOOKINGS
// GET /bookings
// =====================================================

module.exports.myBookings = async (
    req,
    res
) => {

    let bookings =
        await Booking.find({
            user: req.user._id,
        })
            .populate("listing")
            .sort({
                checkIn: 1,
            });


    // Remove bookings whose listing was deleted
    bookings =
        bookings.filter(
            booking => booking.listing
        );


    res.render(
        "bookings/index.ejs",
        {
            bookings,
        }
    );
};


// =====================================================
// HOST DASHBOARD
// =====================================================

module.exports.hostBookings = async (
    req,
    res
) => {

    // =================================================
    // HOST LISTINGS
    // =================================================

    const myListings =
        await Listing.find({
            owner: req.user._id,
        }).populate("reviews");


    const listingIds =
        myListings.map(
            listing => listing._id
        );


    // =================================================
    // BOOKINGS
    // =================================================

    const bookings =
        await Booking.find({
            listing: {
                $in: listingIds,
            },
        })
            .populate("listing")
            .populate("user")
            .sort({
                checkIn: -1,
            });


    // =================================================
    // STATS
    // =================================================

    const totalListings =
        myListings.length;


    const totalBookings =
        bookings.length;


    const confirmedBookings =
        bookings.filter(
            booking =>
                booking.status === "confirmed"
        );


    // =================================================
    // TOTAL REVENUE
    // =================================================

    const totalRevenue =
        confirmedBookings.reduce(
            (sum, booking) =>
                sum +
                (
                    booking.grandTotal ||
                    booking.totalPrice ||
                    0
                ),
            0
        );


    // =================================================
    // AVERAGE RATING
    // =================================================

    let totalRating = 0;

    let totalReviews = 0;


    myListings.forEach(
        listing => {

            const reviews =
                listing.reviews || [];


            reviews.forEach(
                review => {

                    totalRating +=
                        Number(
                            review.rating || 0
                        );

                    totalReviews++;
                }
            );
        }
    );


    const averageRating =
        totalReviews > 0
            ? totalRating / totalReviews
            : 0;


    // =================================================
    // TOTAL GUESTS
    // =================================================

    const totalGuests =
        confirmedBookings.reduce(
            (sum, booking) =>
                sum +
                Number(
                    booking.guests || 0
                ),
            0
        );


    // =================================================
    // OCCUPANCY RATE
    // =================================================

    const occupancyRate =
        totalListings > 0
            ? Math.round(
                (
                    confirmedBookings.length /
                    totalListings
                ) * 100
            )
            : 0;


    // =================================================
    // MONTHLY REVENUE
    // =================================================

    const monthlyRevenue =
        new Array(12).fill(0);


    confirmedBookings.forEach(
        booking => {

            const month =
                new Date(
                    booking.checkIn
                ).getMonth();


            monthlyRevenue[month] +=
                booking.grandTotal ||
                booking.totalPrice ||
                0;
        }
    );


    // =================================================
    // MONTHLY BOOKINGS
    // =================================================

    const monthlyBookings =
        new Array(12).fill(0);


    confirmedBookings.forEach(
        booking => {

            const month =
                new Date(
                    booking.checkIn
                ).getMonth();


            monthlyBookings[month]++;
        }
    );


    // =================================================
    // BEST PERFORMING LISTING
    // =================================================

    const listingStats = {};


    confirmedBookings.forEach(
        booking => {

            if (!booking.listing) {
                return;
            }


            const id =
                booking.listing._id.toString();


            if (!listingStats[id]) {

                listingStats[id] = {

                    listing:
                        booking.listing,

                    bookings: 0,

                    revenue: 0,
                };
            }


            listingStats[id].bookings++;


            listingStats[id].revenue +=
                booking.grandTotal ||
                booking.totalPrice ||
                0;
        }
    );


    let bestListing = null;


    Object.values(
        listingStats
    ).forEach(
        item => {

            if (
                !bestListing ||
                item.revenue >
                bestListing.revenue
            ) {

                bestListing = item;
            }
        }
    );


    // =================================================
    // RATING DISTRIBUTION
    // =================================================

    const ratingDistribution = {

        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
    };


    myListings.forEach(
        listing => {

            const reviews =
                listing.reviews || [];


            reviews.forEach(
                review => {

                    const rating =
                        Number(
                            review.rating
                        );


                    if (
                        ratingDistribution[
                            rating
                        ] !== undefined
                    ) {

                        ratingDistribution[
                            rating
                        ]++;
                    }
                }
            );
        }
    );


    // =================================================
    // MOST VIEWED LISTING
    // =================================================

    let mostViewedListing = null;


    myListings.forEach(
        listing => {

            if (
                !mostViewedListing ||
                (
                    listing.views || 0
                ) >
                (
                    mostViewedListing.views || 0
                )
            ) {

                mostViewedListing =
                    listing;
            }
        }
    );


    // =================================================
    // TOP COUNTRIES
    // =================================================

    const countryStats = {};


    confirmedBookings.forEach(
        booking => {

            if (!booking.listing) {
                return;
            }


            const country =
                booking.listing.country ||
                "Unknown";


            if (!countryStats[country]) {

                countryStats[country] = {

                    bookings: 0,

                    revenue: 0,
                };
            }


            countryStats[country].bookings++;


            countryStats[country].revenue +=
                booking.grandTotal ||
                booking.totalPrice ||
                0;
        }
    );


    const topCountries =
        Object.entries(
            countryStats
        )
            .map(
                ([country, stats]) => ({
                    country,
                    ...stats,
                })
            )
            .sort(
                (a, b) =>
                    b.bookings -
                    a.bookings
            )
            .slice(0, 5);


    // =================================================
    // RENDER
    // =================================================

    res.render(
        "bookings/host.ejs",
        {
            bookings,

            totalListings,

            totalBookings,

            totalRevenue,

            averageRating,

            totalGuests,

            occupancyRate,

            monthlyRevenue,

            monthlyBookings,

            bestListing,

            ratingDistribution,

            mostViewedListing,

            topCountries,
        }
    );
};


// =====================================================
// CANCELLATION POLICY
// =====================================================

function getCancellationPolicy(
    checkInDate
) {

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    const checkIn =
        new Date(checkInDate);

    checkIn.setHours(
        0,
        0,
        0,
        0
    );


    const daysUntilCheckIn =
        Math.round(
            (
                checkIn - today
            ) /
            (1000 * 60 * 60 * 24)
        );


    let refundPercent;

    let label;


    if (
        daysUntilCheckIn >= 7
    ) {

        refundPercent = 100;

        label =
            "Full Refund (7+ days before check-in)";

    } else if (
        daysUntilCheckIn >= 3
    ) {

        refundPercent = 50;

        label =
            "Partial Refund — 50% (3-6 days before check-in)";

    } else {

        refundPercent = 0;

        label =
            "No Refund (less than 3 days before check-in)";
    }


    return {
        daysUntilCheckIn,

        refundPercent,

        label,
    };
}


module.exports.getCancellationPolicy =
    getCancellationPolicy;


// =====================================================
// CANCEL BOOKING
// PUT /listings/:id/bookings/:bookingId/cancel
// =====================================================

module.exports.cancelBooking = async (
    req,
    res
) => {

    const { bookingId } =
        req.params;


    const booking =
        await Booking.findById(
            bookingId
        ).populate({

            path: "listing",

            populate: {
                path: "owner",
            },
        });


    // =================================================
    // CHECK BOOKING
    // =================================================

    if (!booking) {

        req.flash(
            "error",
            "Booking not found."
        );

        return res.redirect(
            "/bookings"
        );
    }


    // =================================================
    // CHECK USER
    // =================================================

    if (
        !booking.user ||
        !booking.user.equals(
            req.user._id
        )
    ) {

        req.flash(
            "error",
            "You cannot cancel this booking."
        );

        return res.redirect(
            "/bookings"
        );
    }


    // =================================================
    // CHECK STATUS
    // =================================================

    if (
        booking.status !== "confirmed"
    ) {

        req.flash(
            "error",
            "This booking is not eligible for cancellation."
        );

        return res.redirect(
            `/bookings/${booking._id}`
        );
    }


    // =================================================
    // PREVENT CANCELLATION AFTER CHECK-IN
    // =================================================

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    const checkIn =
        new Date(
            booking.checkIn
        );

    checkIn.setHours(
        0,
        0,
        0,
        0
    );


    if (checkIn <= today) {

        req.flash(
            "error",
            "This stay has already started or passed, so it can no longer be cancelled."
        );

        return res.redirect(
            `/bookings/${booking._id}`
        );
    }


    // =================================================
    // CANCELLATION POLICY
    // =================================================

    const policy =
        getCancellationPolicy(
            booking.checkIn
        );


    const fullAmount =
        booking.grandTotal ||
        booking.totalPrice ||
        0;


    const refundAmount =
        Math.round(
            (
                fullAmount *
                policy.refundPercent
            ) / 100
        );


    booking.cancellationPolicyApplied =
        policy.label;


    // =================================================
    // PROCESS REFUND
    // =================================================

    if (
        refundAmount > 0 &&
        booking.paymentId
    ) {

        try {

            const refund =
                await razorpay
                    .payments
                    .refund(
                        booking.paymentId,
                        {
                            amount:
                                Math.round(
                                    refundAmount * 100
                                ),

                            speed: "normal",

                            notes: {

                                bookingId:
                                    booking._id.toString(),

                                reason:
                                    "Guest cancellation",

                                policy:
                                    policy.label,
                            },
                        }
                    );


            booking.refundId =
                refund.id;


            booking.refundStatus =
                refund.status === "processed"
                    ? "Processed"
                    : "Pending";


            booking.refundAmount =
                refundAmount;


            booking.paymentStatus =
                "Refunded";

        } catch (error) {

            console.error(
                "Refund failed:",
                error
            );


            booking.refundStatus =
                "Failed";


            booking.refundAmount =
                0;
        }

    } else {

        booking.refundStatus =
            "Not Applicable";


        booking.refundAmount =
            0;
    }


    // =================================================
    // CANCEL BOOKING
    // =================================================

    booking.status =
        "cancelled";


    booking.cancelledAt =
        new Date();


    await booking.save();


    // =================================================
    // HOST NOTIFICATION
    // =================================================

    if (
        booking.listing &&
        booking.listing.owner
    ) {

        await Notification.create({

            user:
                booking.listing.owner._id,

            type:
                "cancellation",

            message:
                `A booking for "${booking.listing.title}" was cancelled by the guest.`,

            link:
                `/listings/${booking.listing._id}`,
        });
    }


    // =================================================
    // GUEST NOTIFICATION
    // =================================================

    const listingTitle =
        booking.listing
            ? booking.listing.title
            : "a listing";


    const guestMessage =
        refundAmount > 0

            ? `Your booking for "${listingTitle}" has been cancelled. A refund of ₹${refundAmount.toLocaleString("en-IN")} (${policy.refundPercent}%) has been initiated.`

            : `Your booking for "${listingTitle}" has been cancelled. As per our cancellation policy (${policy.label}), no refund applies.`;


    await Notification.create({

        user:
            booking.user,

        type:
            "cancellation",

        message:
            guestMessage,

        link:
            `/bookings/cancelled`,
    });


    // =================================================
    // SEND CANCELLATION EMAILS
    // =================================================

    try {

        if (req.user.email) {

            await sendCancellationEmail(

                req.user.email,

                req.user.username,

                {
                    listingTitle,

                    refundAmount,

                    refundStatus:
                        booking.refundStatus,

                    isHost: false,
                }
            );
        }


        if (
            booking.listing &&
            booking.listing.owner &&
            booking.listing.owner.email
        ) {

            await sendCancellationEmail(

                booking.listing.owner.email,

                booking.listing.owner.username,

                {
                    listingTitle:
                        booking.listing.title,

                    refundAmount: 0,

                    refundStatus: "",

                    isHost: true,
                }
            );
        }

    } catch (error) {

        console.error(
            "Cancellation email error:",
            error.message
        );
    }


    // =================================================
    // FLASH MESSAGE
    // =================================================

    if (
        booking.refundStatus ===
        "Failed"
    ) {

        req.flash(
            "error",
            "Booking cancelled, but the automatic refund failed. Please contact support."
        );

    } else if (
        refundAmount > 0
    ) {

        req.flash(
            "success",
            `Booking Cancelled. Refund of ₹${refundAmount.toLocaleString("en-IN")} (${policy.refundPercent}%) initiated.`
        );

    } else {

        req.flash(
            "success",
            `Booking Cancelled. No refund applies under our cancellation policy (${policy.label}).`
        );
    }


    // =================================================
    // REDIRECT
    // =================================================

    return res.redirect(
        `/bookings/${booking._id}`
    );
};


// =====================================================
// CANCELLATION HISTORY
// =====================================================

module.exports.cancellationHistory =
    async (req, res) => {

        const cancelledBookings =
            await Booking.find({

                user:
                    req.user._id,

                status:
                    "cancelled",

            })
                .populate("listing")
                .sort({
                    cancelledAt: -1,

                    updatedAt: -1,
                });


        res.render(
            "bookings/cancelled.ejs",
            {
                cancelledBookings,
            }
        );
    };