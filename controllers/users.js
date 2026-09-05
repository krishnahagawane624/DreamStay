const User = require("../models/user");
const Listing = require("../models/listing");
const { cloudinary } = require("../cloudConfig");
const { generateOtp, sendOtpEmail } = require("../util/mailer");

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup");
};

module.exports.signup = async (req, res, next) => {
    try {

        let { username, email, password } = req.body;

        const newUser = new User({ username, email });

        const otp = generateOtp();
        newUser.emailOtp = otp;
        newUser.emailOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        newUser.isEmailVerified = false;

        const registeredUser = await User.register(newUser, password);

        try {
            await sendOtpEmail(registeredUser.email, registeredUser.username, otp);
        } catch (mailErr) {
            console.error("Failed to send OTP email:", mailErr.message);
            req.flash("error", "Account created, but we couldn't send the verification email. Try resending it.");
        }

        // Hold the user id in session until they verify — don't log in yet
        req.session.pendingVerificationUserId = registeredUser._id;

        req.flash("success", "We've sent a verification code to your email.");

        res.redirect("/verify-email");

    } catch (e) {

        req.flash("error", e.message);

        res.redirect("/signup");

    }

};

module.exports.renderLoginForm = (req, res) => {

    res.render("users/login");

};

module.exports.login = async (req, res, next) => {

    console.log("====== LOGIN DEBUG ======");
    

    if (!req.user) {
        req.flash("error", "Login failed.");
        return res.redirect("/login");
    }

    console.log("Email Verified:", req.user.isEmailVerified);

    if (!req.user.isEmailVerified) {

        req.session.pendingVerificationUserId = req.user._id;

        req.logout(function (err) {

            if (err) return next(err);

            req.flash("error", "Please verify your email.");

            return res.redirect("/verify-email");

        });

        return;
    }

    req.flash("success", "Welcome Back!");
    res.redirect("/listings");
};
module.exports.logout = (req, res, next) => {

    req.logout(function (err) {

        if (err) {
            return next(err);
        }

        req.flash("success", "Logged Out!");

        res.redirect("/listings");

    });

};

// =====================================================
// EMAIL OTP VERIFICATION
// =====================================================

module.exports.renderVerifyEmail = async (req, res) => {

    if (!req.session.pendingVerificationUserId) {
        req.flash("error", "Nothing to verify. Please sign up or log in.");
        return res.redirect("/signup");
    }

    const user = await User.findById(req.session.pendingVerificationUserId);

    if (!user) {
        req.flash("error", "Account not found.");
        return res.redirect("/signup");
    }

    res.render("users/verify-email.ejs", {
        email: user.email,
    });

};

module.exports.verifyEmailOtp = async (req, res, next) => {

    const userId = req.session.pendingVerificationUserId;

    if (!userId) {
        req.flash("error", "Session expired. Please log in again.");
        return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
        req.flash("error", "Account not found.");
        return res.redirect("/signup");
    }

    const { otp } = req.body;

    if (!user.emailOtp || !user.emailOtpExpires || Date.now() > user.emailOtpExpires) {
        req.flash("error", "This code has expired. Please request a new one.");
        return res.redirect("/verify-email");
    }

    if (otp !== user.emailOtp) {
        req.flash("error", "Incorrect code. Please try again.");
        return res.redirect("/verify-email");
    }

    user.isEmailVerified = true;
    user.emailOtp = null;
    user.emailOtpExpires = null;
    await user.save();

    delete req.session.pendingVerificationUserId;

    req.login(user, (err) => {

        if (err) {
            return next(err);
        }

        req.flash("success", "Email verified! Welcome to DreamStay.");
        res.redirect("/listings");

    });

};

module.exports.resendEmailOtp = async (req, res) => {

    const userId = req.session.pendingVerificationUserId;

    if (!userId) {
        req.flash("error", "Session expired. Please log in again.");
        return res.redirect("/login");
    }

    const user = await User.findById(userId);

    if (!user) {
        req.flash("error", "Account not found.");
        return res.redirect("/signup");
    }

    const otp = generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
        await sendOtpEmail(user.email, user.username, otp);
        req.flash("success", "A new code has been sent to your email.");
    } catch (e) {
        console.error("Failed to resend OTP:", e.message);
        req.flash("error", "Couldn't send the email right now. Please try again shortly.");
    }

    res.redirect("/verify-email");

};

// =====================================================
// VIEW PROFILE
// =====================================================

module.exports.renderProfile = async (req, res) => {

    const user = await User.findById(req.user._id);

    const listingCount = await Listing.countDocuments({ owner: user._id });

    res.render("users/profile.ejs", {
        profileUser: user,
        listingCount,
    });

};

// =====================================================
// EDIT PROFILE FORM
// =====================================================

module.exports.renderEditProfile = async (req, res) => {

    const user = await User.findById(req.user._id);

    res.render("users/edit-profile.ejs", {
        profileUser: user,
    });

};

// =====================================================
// UPDATE PROFILE
// =====================================================

module.exports.updateProfile = async (req, res) => {

    const user = await User.findById(req.user._id);

    const { bio, country, responseTime } = req.body.user;

    user.bio = bio;
    user.country = country;
    user.responseTime = responseTime;

    if (req.file) {

        // Delete old photo from Cloudinary if it's not the default
        if (user.profileImageFilename) {
            await cloudinary.uploader.destroy(user.profileImageFilename);
        }

        user.profileImage = req.file.path;
        user.profileImageFilename = req.file.filename;

    }

    await user.save();

    req.flash("success", "Profile updated successfully!");

    res.redirect("/profile");

};
module.exports.googleLogin = async (req, res) => {

    req.flash("success", "Welcome to DreamStay!");

    res.redirect("/listings");

};
// =====================================================
// FORGOT PASSWORD PAGE
// =====================================================

module.exports.renderForgotPassword = (req, res) => {

    res.render("users/forgot-password.ejs");

};
// =====================================================
// SEND RESET PASSWORD OTP
// =====================================================

module.exports.sendResetOtp = async (req, res) => {

    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {

        req.flash("error", "No account found with this email.");

        return res.redirect("/forgot-password");

    }

    const otp = generateOtp();

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    try {

        await sendOtpEmail(user.email, user.username, otp);

    } catch (err) {

        console.log(err);

        req.flash("error", "Unable to send OTP.");

        return res.redirect("/forgot-password");

    }

    req.session.resetPasswordUser = user._id;

    req.flash("success", "OTP sent successfully.");

    res.redirect("/reset-password");

};
// =====================================================
// RENDER RESET PASSWORD PAGE
// =====================================================

module.exports.renderResetPassword = (req, res) => {

    if (!req.session.resetPasswordUser) {

        req.flash("error", "Session expired.");

        return res.redirect("/forgot-password");

    }

    res.render("users/reset-password");

};

// =====================================================
// RESET PASSWORD
// =====================================================

module.exports.resetPassword = async (req, res) => {

    const { otp, password } = req.body;

    const userId = req.session.resetPasswordUser;

    if (!userId) {

        req.flash("error", "Session expired.");

        return res.redirect("/forgot-password");

    }

    const user = await User.findById(userId);

    if (!user) {

        req.flash("error", "User not found.");

        return res.redirect("/forgot-password");

    }

    if (
        user.resetPasswordOtp !== otp ||
        Date.now() > user.resetPasswordOtpExpires
    ) {

        req.flash("error", "Invalid or expired OTP.");

        return res.redirect("/reset-password");

    }

    // Change password
    await user.setPassword(password);

    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;

    await user.save();

    delete req.session.resetPasswordUser;

    req.flash("success", "Password changed successfully.");

    res.redirect("/login");

};