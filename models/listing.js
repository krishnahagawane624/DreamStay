const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },

    description: String,

    // Cover image — mirrors images[0]. Kept for backward compatibility with
    // templates/cards that only render a single image (e.g. similar listings).
    image: {
        url: String,
        filename: String,
    },

    // All uploaded images for the listing gallery.
 images: [
        {
            url: {
                type: String,
                required: true,
            },
            filename: {
                type: String,
                required: true,
            },
            caption: {
                type: String,
                default: "",
            },
            // SHA-256 hash of the raw image bytes — used to detect the same
            // photo being reused across multiple (possibly fraudulent) listings.
            imageHash: {
                type: String,
                default: "",
            },
        },
    ],

    // ==========================
    // AI FRAUD DETECTION
    // Set when an uploaded photo's hash matches a photo already used on
    // another owner's listing — a common signal of a copied/scam listing.
    // ==========================

    fraudWarning: {
        flagged: {
            type: Boolean,
            default: false,
        },
        message: {
            type: String,
            default: "",
        },
        matchedListing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listing",
            default: null,
        },
    },

    price: Number,
    location: String,
    country: String,

    // ==========================
    // COMPARE LISTINGS FIELDS
    // ==========================

    maxGuests: {
    type: Number,
    default: 10,
    min: 1,
    max: 10,
},

    bedrooms: {
        type: Number,
        default: 1,
    },

    amenities: {
        type: [String],
        default: [],
    },

    // ==========================
    // HOST ANALYTICS FIELDS
    // ==========================

    views: {
        type: Number,
        default: 0,
    },

    geometry: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    },

    category: {
        type: String,
        enum: [
            "Beach",
            "Mountain",
            "Camping",
            "Villa",
            "Lake",
            "Forest",
            "Snow",
            "City",
            "Luxury",
            "Desert",
            "Heritage",
            "Trending"
        ],
        default: "Trending",
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
});

// ==========================================
// VIRTUAL: Average Rating
// ==========================================

listingSchema.virtual("averageRating").get(function () {

    if (!this.reviews || this.reviews.length === 0) {
        return null;
    }

    let total = 0;

    this.reviews.forEach((review) => {

        // Works after populate("reviews")
        if (review.rating) {
            total += review.rating;
        }

    });

    return (total / this.reviews.length).toFixed(1);

});

// ==========================================
// VIRTUAL: Review Count
// ==========================================

listingSchema.virtual("reviewCount").get(function () {

    if (!this.reviews) return 0;

    return this.reviews.length;

});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;