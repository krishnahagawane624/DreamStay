const express = require("express");
const router = express.Router();

const passport = require("passport");
const multer = require("multer");
const { profileStorage } = require("../cloudConfig");
const upload = multer({ storage: profileStorage });

const userController = require("../controllers/users");
const { isLoggedIn } = require("../middleware");

// ==========================
// Signup
// ==========================

router
.route("/signup")
.get(userController.renderSignupForm)
.post(userController.signup);

// ==========================
// Login
// ==========================

router
.route("/login")
.get(userController.renderLoginForm)
.post(
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    userController.login
);

// ==========================
// Google Login
// ==========================

router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    userController.googleLogin
);
// Forgot Password
router
.route("/forgot-password")
.get(userController.renderForgotPassword)
.post(userController.sendResetOtp);


router
.route("/reset-password")
.get(userController.renderResetPassword)
.post(userController.resetPassword);

// ==========================
// Logout
// ==========================

router.get("/logout", userController.logout);

// ==========================
// Email Verification
// ==========================

router.get("/verify-email", userController.renderVerifyEmail);

router.post("/verify-email", userController.verifyEmailOtp);

router.post("/verify-email/resend", userController.resendEmailOtp);

// ==========================
// Profile
// ==========================

router.get("/profile", isLoggedIn, userController.renderProfile);

router.get("/profile/edit", isLoggedIn, userController.renderEditProfile);

router.put(
    "/profile",
    isLoggedIn,
    upload.single("user[profileImage]"),
    userController.updateProfile
);

module.exports = router;