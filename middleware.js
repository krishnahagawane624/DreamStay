const Listing = require("./models/listing");
const Review = require("./models/review");
const Booking = require("./models/booking");

// ==========================================
// CHECK LOGIN
// ==========================================

module.exports.isLoggedIn = (req, res, next) => {

    if (!req.isAuthenticated()) {

        req.flash("error", "You must be logged in first!");

        return res.redirect("/login");
    }

    next();
};


// ==========================================
// CHECK LISTING OWNER
// ==========================================

module.exports.isOwner = async (req, res, next) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {

        req.flash("error", "Listing not found!");

        return res.redirect("/listings");
    }

    if (!listing.owner || !listing.owner.equals(req.user._id)) {

        req.flash("error", "You don't have permission to do that!");

        return res.redirect(`/listings/${id}`);
    }

    next();
};


// ==========================================
// CHECK REVIEW AUTHOR
// ==========================================

module.exports.isReviewAuthor = async (req, res, next) => {

    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {

        req.flash("error", "Review not found!");

        return res.redirect("back");
    }

    if (!review.author || !review.author.equals(req.user._id)) {

        req.flash("error", "You are not the author of this review!");

        return res.redirect("back");
    }

    next();
};


// ==========================================
// VERIFIED BOOKING REQUIRED FOR REVIEW
// ==========================================

module.exports.hasBookedListing = async (req, res, next) => {

    const { id } = req.params;

    const booking = await Booking.findOne({
        listing: id,
        user: req.user._id,
        status: "confirmed",
    });

    if (!booking) {

        req.flash(
            "error",
            "You can only review listings you've booked and stayed at."
        );

        return res.redirect(`/listings/${id}`);
    }

    next();
};