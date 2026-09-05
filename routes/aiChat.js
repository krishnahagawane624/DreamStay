const express = require("express");
const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const aiChatController = require("../controllers/aiChat");

// Anyone (logged in or not) can talk to the assistant.
router.post(
    "/",
    wrapAsync(aiChatController.chat)
);

module.exports = router;