const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    checkIn: {
        type: Date,
        required: true,
    },
    checkOut: {
        type: Date,
        required: true,
    },
    guests: {
        type: Number,
        required: true,
        default: 1,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    serviceFee: {
        type: Number,
        default: 0,
    },
    gstRate: {
        type: Number,
        default: 0,
    },
    gstAmount: {
        type: Number,
        default: 0,
    },
    grandTotal: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ["pending","confirmed", "cancelled"],
        default: "confirmed",
    },
    paymentId: {
    type: String,
},

orderId: {
    type: String,
},

paymentStatus: {
    type: String,
    default: "Pending",
},

refundId: {
    type: String,
    default: null,
},

refundStatus: {
    type: String,
    enum: ["Not Applicable", "Pending", "Processed", "Failed"],
    default: "Not Applicable",
},

refundAmount: {
    type: Number,
    default: 0,
},

cancelledAt: {
    type: Date,
    default: null,
},

cancellationPolicyApplied: {
    type: String,
    default: "",
},

}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);