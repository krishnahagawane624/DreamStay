const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/booking");
const cloudinary = require("../cloudConfig");
// =======================
// Show Profile
// =======================

module.exports.showProfile = async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate("wishlist");

    const listings = await Listing.find({
        owner: user._id,
    });

    const bookings = await Booking.find({
        user: user._id,
    });

    const totalBookings = bookings.length;
    const totalListings = listings.length;

    // Average Rating
    let totalRating = 0;
    let reviewCount = 0;

    listings.forEach((listing) => {

        if (listing.rating) {
            totalRating += listing.rating;
            reviewCount++;
        }

    });

    const averageRating =
        reviewCount > 0
            ? (totalRating / reviewCount).toFixed(1)
            : 0;

    res.render("users/profile", {
        user,
        totalBookings,
        totalListings,
        averageRating,
        listings,
    });

};

// =======================
// Render Edit Profile
// =======================

module.exports.renderEditProfile = async (req, res) => {

    const user = await User.findById(req.user._id);

    res.render("users/editProfile", {
        user,
    });

};

// =======================
// Update Profile
// =======================

module.exports.updateProfile = async (req, res) => {

    const user = await User.findById(req.user._id);

    user.bio = req.body.user.bio;
    user.phone = req.body.user.phone;
    user.address = req.body.user.address;
    user.city = req.body.user.city;
    user.state = req.body.user.state;
    user.country = req.body.user.country;

    // Upload new profile image
    if (req.file) {

        // Delete old image from Cloudinary
        if (
            user.profileImageFilename &&
            user.profileImageFilename !== null
        ) {
            await cloudinary.uploader.destroy(user.profileImageFilename);
        }

        user.profileImage = req.file.path;
        user.profileImageFilename = req.file.filename;
    }

    await user.save();

    req.flash("success", "Profile Updated Successfully!");

    res.redirect("/profile");
};