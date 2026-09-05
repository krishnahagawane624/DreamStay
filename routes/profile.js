const express = require("express");
const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const profileController = require("../controllers/profile");
const { isLoggedIn } = require("../middleware");

const multer = require("multer");
const { storage } = require("../cloudConfig");

const upload = multer({ storage });


// =======================
// Show Profile
// =======================

router.get(
    "/",
    isLoggedIn,
    wrapAsync(profileController.showProfile)
);


// =======================
// Edit Profile
// =======================

router.get(
    "/edit",
    isLoggedIn,
    wrapAsync(profileController.renderEditProfile)
);


// =======================
// Update Profile
// =======================

router.put(
    "/",
    isLoggedIn,
    upload.single("profileImage"),
    wrapAsync(profileController.updateProfile)
);

module.exports = router;