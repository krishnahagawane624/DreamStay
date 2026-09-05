const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../util/wrapAsync");
const reviewController = require("../controllers/reviews");
const { isLoggedIn, isReviewAuthor, hasBookedListing } = require("../middleware");

// Create Review
router.post(
    "/",
    isLoggedIn,
    hasBookedListing,
    wrapAsync(reviewController.createReview)
);

// Delete Review
router.delete(
    "/:reviewId",
    isLoggedIn,
    isReviewAuthor,
    wrapAsync(reviewController.destroyReview)
);
module.exports = router;