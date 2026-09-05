const express = require("express");

const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const bookingController = require("../controllers/bookings");
const { isLoggedIn } = require("../middleware");


// =====================================================
// MY BOOKINGS
// GET /bookings
// =====================================================

router.get(
    "/bookings",
    isLoggedIn,
    wrapAsync(bookingController.myBookings)
);


// =====================================================
// HOST BOOKINGS
// GET /bookings/hosting
// =====================================================

router.get(
    "/bookings/hosting",
    isLoggedIn,
    wrapAsync(bookingController.hostBookings)
);


// =====================================================
// CANCELLATION HISTORY
// GET /bookings/cancelled
// =====================================================

router.get(
    "/bookings/cancelled",
    isLoggedIn,
    wrapAsync(bookingController.cancellationHistory)
);


// =====================================================
// BOOKING DETAILS
// GET /bookings/:bookingId
// =====================================================

router.get(
    "/bookings/:bookingId",
    isLoggedIn,
    wrapAsync(bookingController.bookingDetails)
);


// =====================================================
// DOWNLOAD INVOICE
// GET /bookings/:bookingId/invoice
// =====================================================

router.get(
    "/bookings/:bookingId/invoice",
    isLoggedIn,
    wrapAsync(bookingController.downloadInvoice)
);


// =====================================================
// CANCEL BOOKING
// DELETE /bookings/:bookingId
// =====================================================

router.delete(
    "/bookings/:bookingId",
    isLoggedIn,
    wrapAsync(bookingController.cancelBooking)
);


module.exports = router;