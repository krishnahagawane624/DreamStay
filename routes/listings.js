const multer = require("multer");
const { storage } = require("../cloudConfig");
const upload = multer({ storage });

const express = require("express");
const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const listingController = require("../controllers/listings");
const { isLoggedIn, isOwner } = require("../middleware");

// Index Route
router.get(
    "/",
    wrapAsync(listingController.index)
);

// New Route
router.get(
    "/new",
    isLoggedIn,
    listingController.renderNewForm
);

// My Listings Route (must come before "/:id")
router.get(
    "/mine",
    isLoggedIn,
    wrapAsync(listingController.myListings)
);

// Compare Listings Route (must come before "/:id")
// GET /listings/compare?ids=id1,id2,id3
router.get(
    "/compare",
    wrapAsync(listingController.compareListings)
);

// Search Suggestions (must come before "/:id")
router.get(
    "/search/suggestions",
    wrapAsync(listingController.searchSuggestions)
);

// AI Description Generator
router.post(
    "/generate-description",
    isLoggedIn,
    wrapAsync(listingController.generateDescriptionAPI)
);

// Create Route — field name "listing[images]" must match the <input name="...">
// in new.ejs. Up to 8 images per listing.
router.post(
    "/",
    isLoggedIn,
    upload.array("listing[images]", 8),
    wrapAsync(listingController.createListing)
);

// Show Route
router.get(
    "/:id",
    wrapAsync(listingController.showListing)
);

// Edit Route
router.get(
    "/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.renderEditForm)
);

// Update Route — reuses createListing/updateListing logic already written in
// the controller (it replaces all images when new files are uploaded, and
// leaves existing images untouched otherwise).
router.put(
    "/:id",
    isLoggedIn,
    isOwner,
    upload.array("listing[images]", 8),
    wrapAsync(listingController.updateListing)
);

// Delete Route
router.delete(
    "/:id",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.destroyListing)
);

module.exports = router;