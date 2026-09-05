const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment");
const { isLoggedIn } = require("../middleware");

// ============================================================
// CREATE RAZORPAY ORDER
// POST /payment/create-order
// ============================================================
router.post(
    "/create-order",
    isLoggedIn,
    paymentController.createOrder
);

// ============================================================
// VERIFY RAZORPAY PAYMENT
// POST /payment/verify
// ============================================================
router.post(
    "/verify",
    isLoggedIn,
    paymentController.verifyPayment
);

module.exports = router;