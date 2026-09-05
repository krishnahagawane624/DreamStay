const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new mongoose.Schema({

    // ==========================
    // Email
    // ==========================

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    // ==========================
    // Email Verification
    // ==========================

    isEmailVerified: {
        type: Boolean,
        default: false,
    },

    emailOtp: {
        type: String,
        default: null,
    },

    emailOtpExpires: {
        type: Date,
        default: null,
    },

    // ==========================
    // Forgot Password OTP
    // ==========================

    resetPasswordOtp: {
        type: String,
        default: null,
    },

    resetPasswordOtpExpires: {
        type: Date,
        default: null,
    },

    // ==========================
    // Google Login
    // ==========================

    googleId: {
        type: String,
        default: null,
    },

    authType: {
        type: String,
        enum: ["local", "google"],
        default: "local",
    },
    // ==========================
// Admin Role
// ==========================

role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
},

    // ==========================
    // Profile
    // ==========================

    profileImage: {
        type: String,
        default:
            "https://ui-avatars.com/api/?background=FF5A5F&color=fff&size=256&name=User",
    },

    profileImageFilename: {
        type: String,
        default: null,
    },

    bio: {
        type: String,
        default: "Love traveling and hosting amazing guests.",
    },

    phone: {
    type: String,
    default: "",
},

address: {
    type: String,
    default: "",
},

city: {
    type: String,
    default: "",
},

state: {
    type: String,
    default: "",
},
    country: {
        type: String,
        default: "India",
    },

    responseRate: {
        type: Number,
        default: 100,
    },

    responseTime: {
        type: String,
        default: "Within 1 hour",
    },

    isSuperHost: {
        type: Boolean,
        default: true,
    },
    
    isVerifiedHost: {
    type: Boolean,
    default: true,
},

    // ==========================
    // Wishlist
    // ==========================

    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listing",
        },
    ],
    // ==========================
// Recently Viewed Listings
// ==========================

recentlyViewed: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing",
    },
],

}, {
    timestamps: true,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);