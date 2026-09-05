const Listing = require("../models/listing");
const Review = require("../models/review");
const Notification = require("../models/notification");

// Create Review
module.exports.createReview = async (req, res) => {

    let listing = await Listing.findById(req.params.id);

    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;

    listing.reviews.push(newReview);

    await newReview.save();

    await listing.save();

    // ==========================================
    // NOTIFICATION: notify host of new review
    // ==========================================

    if (listing.owner && !listing.owner.equals(req.user._id)) {

        await Notification.create({
            user: listing.owner,
            type: "review",
            message: `Your listing "${listing.title}" received a new ${newReview.rating}★ review.`,
            link: `/listings/${listing._id}`,
        });

    }

    req.flash("success", "Review Added Successfully!");

    res.redirect(`/listings/${listing._id}`);
};

// Delete Review

module.exports.destroyReview = async (req, res) => {

    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, {
        $pull: {
            reviews: reviewId,
        },
    });

    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review Deleted Successfully!");

    res.redirect(`/listings/${id}`);

};