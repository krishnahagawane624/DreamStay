const express = require("express");
const router = express.Router();

const wrapAsync = require("../util/wrapAsync");
const notificationController = require("../controllers/notifications");
const { isLoggedIn } = require("../middleware");

// List notifications
router.get(
    "/notifications",
    isLoggedIn,
    wrapAsync(notificationController.index)
);

// Mark one as read
router.put(
    "/notifications/:id/read",
    isLoggedIn,
    wrapAsync(notificationController.markAsRead)
);

// Mark all as read
router.put(
    "/notifications/read-all",
    isLoggedIn,
    wrapAsync(notificationController.markAllRead)
);

module.exports = router;