const express = require("express");
const router = express.Router({
    mergeParams: true
});

const wrapAsync = require("../util/wrapAsync");
const bookingController = require("../controllers/bookings");
const { isLoggedIn } = require("../middleware");

// =====================================================
// CREATE BOOKING
// POST /listings/:id/bookings
// =====================================================
router.post(
    "/",
    isLoggedIn,
    wrapAsync(bookingController.createBooking)
);

// =====================================================
// BOOKING SUCCESS
// GET /listings/:id/bookings/success/:bookingId
// =====================================================
router.get(
    "/success/:bookingId",
    isLoggedIn,
    wrapAsync(bookingController.bookingSuccess)
);

// =====================================================
// DOWNLOAD INVOICE
// GET /listings/:id/bookings/:bookingId/invoice
// =====================================================
router.get(
    "/:bookingId/invoice",
    isLoggedIn,
    wrapAsync(bookingController.downloadInvoice)
);

// =====================================================
// BOOKING DETAILS
// GET /listings/:id/bookings/:bookingId
// =====================================================
router.get(
    "/:bookingId",
    isLoggedIn,
    wrapAsync(bookingController.bookingDetails)
);

// =====================================================
// CANCEL BOOKING
// PUT /listings/:id/bookings/:bookingId/cancel
// =====================================================
router.put(
    "/:bookingId/cancel",
    isLoggedIn,
    wrapAsync(bookingController.cancelBooking)
);

module.exports = router;