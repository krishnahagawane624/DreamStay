const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// CREATE RAZORPAY ORDER
// ==========================================

module.exports.createOrder = async (req, res) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Please login before making a payment.",
            });
        }

        const { amount } = req.body;

        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount.",
            });
        }

        const options = {
            amount: Math.round(numericAmount * 100),
            currency: "INR",
            receipt: `dreamstay_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
        });

    } catch (error) {

        console.error(
            "Razorpay order creation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to create payment order.",
        });
    }
};


// ==========================================
// VERIFY RAZORPAY PAYMENT
// ==========================================

module.exports.verifyPayment = async (req, res) => {
    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first.",
            });
        }

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment details are incomplete.",
            });
        }

        const generatedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                `${razorpay_order_id}|${razorpay_payment_id}`
            )
            .digest("hex");

        if (
            generatedSignature !== razorpay_signature
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully.",
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
        });

    } catch (error) {

        console.error(
            "Payment verification error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Payment verification failed.",
        });
    }
};