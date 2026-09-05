const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const reviewSchema = new Schema({

    comment: {

        type: String,

        required: true,

    },

    rating: {

        type: Number,

        min: 1,

        max: 5,

        required: true,

    },
    author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
},

    // True only when the reviewer had a confirmed booking for this listing
    // at the time the review was created (see middleware.hasBookedListing)
    verifiedStay: {
        type: Boolean,
        default: false,
    },

    createdAt: {

        type: Date,

        default: Date.now,

    },

});

module.exports = mongoose.model("Review", reviewSchema);