const express = require("express");
const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const wishlistController = require("../controllers/wishlist");
const { isLoggedIn } = require("../middleware");

// =======================
// SHOW WISHLIST
// =======================
router.get(
    "/wishlist",
    isLoggedIn,
    wrapAsync(wishlistController.showWishlist)
);

// =======================
// ADD
// =======================
router.post(
    "/wishlist/:id",
    isLoggedIn,
    wrapAsync(wishlistController.addToWishlist)
);

// =======================
// REMOVE
// =======================
router.delete(
    "/wishlist/:id",
    isLoggedIn,
    wrapAsync(wishlistController.removeFromWishlist)
);

module.exports = router;