const express = require("express");
const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const chatController = require("../controllers/chat");
const { isLoggedIn } = require("../middleware");

// Inbox — list all my conversations
router.get(
    "/",
    isLoggedIn,
    wrapAsync(chatController.inbox)
);

// Start (or resume) a conversation about a specific listing
router.get(
    "/start/:listingId",
    isLoggedIn,
    wrapAsync(chatController.startConversation)
);

// View a single conversation thread
router.get(
    "/:conversationId",
    isLoggedIn,
    wrapAsync(chatController.showConversation)
);

module.exports = router;