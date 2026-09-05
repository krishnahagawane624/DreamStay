const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conversationSchema = new Schema({

    // The two people talking — always exactly 2 participants
    participants: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    ],

    // Optional: which listing this conversation is about
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        default: null,
    },

    lastMessage: {
        type: String,
        default: "",
    },

    lastMessageAt: {
        type: Date,
        default: Date.now,
    },

}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);