const Notification = require("../models/notification");

// ==========================================
// LIST NOTIFICATIONS
// ==========================================

module.exports.index = async (req, res) => {

    const notifications = await Notification.find({
        user: req.user._id,
    }).sort({ createdAt: -1 });

    res.render("notifications/index.ejs", {
        notifications,
    });

};

// ==========================================
// MARK ONE AS READ
// ==========================================

module.exports.markAsRead = async (req, res) => {

    const { id } = req.params;

    await Notification.findOneAndUpdate(
        { _id: id, user: req.user._id },
        { isRead: true }
    );

    res.redirect("back");

};

// ==========================================
// MARK ALL AS READ
// ==========================================

module.exports.markAllRead = async (req, res) => {

    await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { isRead: true }
    );

    res.redirect("back");

};