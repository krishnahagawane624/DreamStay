const razorpay = require("../util/razorpay");
const crypto = require("crypto");

const Listing = require("../models/listing");
const Booking = require("../models/booking");


// =====================================================
// PRICE CALCULATION
// =====================================================

function calculateBookingPrice(listing, checkIn, checkOut) {

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);


    // ---------------------------------------------
    // VALIDATE DATES
    // ---------------------------------------------

    if (
        Number.isNaN(checkInDate.getTime()) ||
        Number.isNaN(checkOutDate.getTime())
    ) {
        throw new Error("Invalid dates.");
    }


    if (checkOutDate <= checkInDate) {
        throw new Error(
            "Check-out must be after check-in."
        );
    }


    // ---------------------------------------------
    // CALCULATE NIGHTS
    // ---------------------------------------------

    const nights = Math.ceil(
        (checkOutDate - checkInDate) /
        (1000 * 60 * 60 * 24)
    );


    if (nights <= 0) {
        throw new Error("Invalid number of nights.");
    }


    // ---------------------------------------------
    // ROOM PRICE
    // ---------------------------------------------

    const totalPrice =
        listing.price * nights;


    // ---------------------------------------------
    // SERVICE FEE
    // ---------------------------------------------

    const serviceFee =
        Math.round(totalPrice * 0.10);


    // ---------------------------------------------
    // GST
    // ---------------------------------------------

    const gstRate =
        listing.price <= 7500
            ? 0.12
            : 0.18;


    const gstAmount =
        Math.round(
            (totalPrice + serviceFee) *
            gstRate
        );


    // ---------------------------------------------
    // GRAND TOTAL
    // ---------------------------------------------

    const grandTotal =
        totalPrice +
        serviceFee +
        gstAmount;


    return {
        nights,
        totalPrice,
        serviceFee,
        gstRate,
        gstAmount,
        grandTotal,
    };
}


// =====================================================
// CREATE RAZORPAY ORDER
// =====================================================

module.exports.createOrder = async (req, res) => {

    try {

        // ---------------------------------------------
        // AUTHENTICATION
        // ---------------------------------------------

        if (!req.isAuthenticated()) {

            return res.status(401).json({
                success: false,
                message:
                    "Please login before making a payment.",
            });

        }


        // ---------------------------------------------
        // GET BOOKING DATA
        // ---------------------------------------------

        const {
            listingId,
            checkIn,
            checkOut,
            guests,
        } = req.body;


        // ---------------------------------------------
        // BASIC VALIDATION
        // ---------------------------------------------

        if (
            !listingId ||
            !checkIn ||
            !checkOut ||
            !guests
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Booking details are incomplete.",
            });

        }


        // ---------------------------------------------
        // FIND LISTING
        // ---------------------------------------------

        const listing =
            await Listing.findById(listingId);


        if (!listing) {

            return res.status(404).json({
                success: false,
                message:
                    "Listing not found.",
            });

        }


        // ---------------------------------------------
        // VALIDATE GUESTS
        // ---------------------------------------------

        const guestCount =
            Number(guests);


        if (
            !Number.isInteger(guestCount) ||
            guestCount < 1 ||
            guestCount > 10
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "You can select between 1 and 10 guests.",
            });

        }


        // ---------------------------------------------
        // CALCULATE PRICE
        // ---------------------------------------------

        const price =
            calculateBookingPrice(
                listing,
                checkIn,
                checkOut
            );


        const checkInDate =
            new Date(checkIn);

        const checkOutDate =
            new Date(checkOut);


        // ---------------------------------------------
        // PREVENT PAST CHECK-IN
        // ---------------------------------------------

        const today = new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        if (checkInDate < today) {

            return res.status(400).json({
                success: false,
                message:
                    "Check-in date cannot be in the past.",
            });

        }


        // ---------------------------------------------
        // CHECK AVAILABILITY
        // ---------------------------------------------

        const existingBooking =
            await Booking.findOne({

                listing: listingId,

                status: "confirmed",

                checkIn: {
                    $lt: checkOutDate,
                },

                checkOut: {
                    $gt: checkInDate,
                },

            });


        if (existingBooking) {

            return res.status(409).json({
                success: false,
                message:
                    "These dates are already booked.",
            });

        }


        // ---------------------------------------------
        // CREATE RAZORPAY ORDER
        // ---------------------------------------------

        const order =
            await razorpay.orders.create({

                amount:
                    Math.round(
                        price.grandTotal * 100
                    ),

                currency: "INR",

                receipt:
                    `dreamstay_${Date.now()}_${req.user._id}`,

                notes: {

                    userId:
                        req.user._id.toString(),

                    listingId:
                        listingId.toString(),

                    checkIn:
                        checkInDate.toISOString(),

                    checkOut:
                        checkOutDate.toISOString(),

                    guests:
                        guestCount.toString(),

                },

            });


        // ---------------------------------------------
        // RETURN ORDER
        // ---------------------------------------------

        return res.status(200).json({

            success: true,

            orderId:
                order.id,

            amount:
                order.amount,

            currency:
                order.currency,

            key:
                process.env.RAZORPAY_KEY_ID,

        });

    } catch (error) {

        console.error(
            "Razorpay order creation error:",
            error
        );


        return res.status(400).json({

            success: false,

            message:
                error.message ||
                "Unable to create payment order.",

        });

    }

};


// =====================================================
// VERIFY PAYMENT
// =====================================================

module.exports.verifyPayment = async (req, res) => {

    try {

        // ---------------------------------------------
        // AUTHENTICATION
        // ---------------------------------------------

        if (!req.isAuthenticated()) {

            return res.status(401).json({
                success: false,
                message:
                    "Please login first.",
            });

        }


        // ---------------------------------------------
        // GET RAZORPAY DATA
        // ---------------------------------------------

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;


        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment details are incomplete.",
            });

        }


        // ---------------------------------------------
        // VERIFY SIGNATURE
        // ---------------------------------------------

        const body =
            razorpay_order_id +
            "|" +
            razorpay_payment_id;


        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    process.env.RAZORPAY_KEY_SECRET
                )
                .update(body)
                .digest("hex");


        if (
            expectedSignature.length !==
            razorpay_signature.length
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment signature verification failed.",
            });

        }


        const signatureValid =
            crypto.timingSafeEqual(
                Buffer.from(expectedSignature),
                Buffer.from(razorpay_signature)
            );


        if (!signatureValid) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment signature verification failed.",
            });

        }


        // ---------------------------------------------
        // FETCH ORDER
        // ---------------------------------------------

        const order =
            await razorpay.orders.fetch(
                razorpay_order_id
            );


        // ---------------------------------------------
        // VERIFY ORDER USER
        // ---------------------------------------------

        if (
            !order.notes ||
            order.notes.userId !==
            req.user._id.toString()
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Payment order does not belong to this user.",
            });

        }


        // ---------------------------------------------
        // VERIFY CURRENCY
        // ---------------------------------------------

        if (
            order.currency !== "INR"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment currency.",
            });

        }


        // ---------------------------------------------
        // FETCH PAYMENT
        // ---------------------------------------------

        const payment =
            await razorpay.payments.fetch(
                razorpay_payment_id
            );


        // ---------------------------------------------
        // VERIFY PAYMENT ORDER
        // ---------------------------------------------

        if (
            payment.order_id !==
            razorpay_order_id
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment does not belong to this order.",
            });

        }


        // ---------------------------------------------
        // VERIFY PAYMENT AMOUNT
        // ---------------------------------------------

        if (
            payment.amount !==
            order.amount
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment amount mismatch.",
            });

        }


        // ---------------------------------------------
        // VERIFY PAYMENT CURRENCY
        // ---------------------------------------------

        if (
            payment.currency !== "INR"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment currency.",
            });

        }


        // ---------------------------------------------
        // VERIFY PAYMENT CAPTURED
        // ---------------------------------------------

        if (
            payment.status !== "captured"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment has not been captured.",
            });

        }


        // ---------------------------------------------
        // PREVENT DUPLICATE PAYMENT
        // ---------------------------------------------

        const alreadyProcessed =
            await Booking.findOne({

                paymentId:
                    razorpay_payment_id,

            });


        if (alreadyProcessed) {

            return res.status(200).json({

                success: true,

                bookingId:
                    alreadyProcessed._id,

                message:
                    "Payment was already processed.",

            });

        }


        // ---------------------------------------------
        // PREVENT DUPLICATE ORDER
        // ---------------------------------------------

        const existingOrder =
            await Booking.findOne({

                orderId:
                    razorpay_order_id,

            });


        if (existingOrder) {

            return res.status(409).json({

                success: false,

                message:
                    "This payment order has already been used.",

            });

        }


        // ---------------------------------------------
        // VERIFY ORDER NOTES
        // ---------------------------------------------

        if (
            !order.notes ||
            !order.notes.listingId ||
            !order.notes.checkIn ||
            !order.notes.checkOut ||
            !order.notes.guests
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment order contains incomplete booking information.",

            });

        }


        // ---------------------------------------------
        // GET BOOKING DATA
        // ---------------------------------------------

        const listingId =
            order.notes.listingId;


        const checkIn =
            new Date(
                order.notes.checkIn
            );


        const checkOut =
            new Date(
                order.notes.checkOut
            );


        const guests =
            Number(
                order.notes.guests
            );


        // ---------------------------------------------
        // VALIDATE GUESTS
        // ---------------------------------------------

        if (
            !Number.isInteger(guests) ||
            guests < 1 ||
            guests > 10
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid guest information.",

            });

        }


        // ---------------------------------------------
        // FIND LISTING
        // ---------------------------------------------

        const listing =
            await Listing.findById(
                listingId
            ).populate("owner");


        if (!listing) {

            return res.status(404).json({

                success: false,

                message:
                    "Listing no longer exists.",

            });

        }


        // ---------------------------------------------
        // RECALCULATE PRICE
        // ---------------------------------------------

        const price =
            calculateBookingPrice(
                listing,
                checkIn,
                checkOut
            );


        // ---------------------------------------------
        // VERIFY FINAL AMOUNT
        // ---------------------------------------------

        const expectedAmount =
            Math.round(
                price.grandTotal * 100
            );


        if (
            order.amount !==
            expectedAmount
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment amount does not match booking price.",

            });

        }


        // ---------------------------------------------
        // CHECK AVAILABILITY AGAIN
        // ---------------------------------------------

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


        if (existingBooking) {

            return res.status(409).json({

                success: false,

                message:
                    "These dates were booked while payment was processing.",

            });

        }


        // ---------------------------------------------
        // CREATE BOOKING
        // ---------------------------------------------

        const booking =
            new Booking({

                listing:
                    listingId,

                user:
                    req.user._id,

                checkIn,

                checkOut,

                guests,

                totalPrice:
                    price.totalPrice,

                serviceFee:
                    price.serviceFee,

                gstRate:
                    price.gstRate,

                gstAmount:
                    price.gstAmount,

                grandTotal:
                    price.grandTotal,

                paymentId:
                    razorpay_payment_id,

                orderId:
                    razorpay_order_id,

                paymentStatus:
                    "Paid",

                status:
                    "confirmed",

            });


        await booking.save();


        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        return res.status(200).json({

            success: true,

            bookingId:
                booking._id,

            message:
                "Payment verified and booking confirmed.",

        });

    } catch (error) {

        console.error(
            "Payment verification error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Payment verification failed.",

        });

    }

};