const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({

    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    type: {
        type: String,
        enum: ["booking", "cancellation", "review"],
        required: true,
    },

    message: {
        type: String,
        required: true,
    },

    link: {
        type: String,
        default: "",
    },

    isRead: {
        type: Boolean,
        default: false,
    },

}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);