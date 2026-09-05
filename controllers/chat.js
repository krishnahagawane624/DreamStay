const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Listing = require("../models/listing");

// ==========================================
// INBOX — all conversations for the logged-in user
// ==========================================

module.exports.inbox = async (req, res) => {

    const conversations = await Conversation.find({
        participants: req.user._id,
    })
        .populate("participants", "username profileImage")
        .populate("listing", "title image")
        .sort({ lastMessageAt: -1 });

    // Unread count per conversation, for the little badges in the list
    const conversationIds = conversations.map(c => c._id);

    const unreadCounts = await Message.aggregate([
        {
            $match: {
                conversation: { $in: conversationIds },
                sender: { $ne: req.user._id },
                read: false,
            },
        },
        {
            $group: {
                _id: "$conversation",
                count: { $sum: 1 },
            },
        },
    ]);

    const unreadMap = {};
    unreadCounts.forEach((entry) => {
        unreadMap[entry._id.toString()] = entry.count;
    });

    res.render("chat/inbox.ejs", {
        conversations,
        unreadMap,
    });

};

// ==========================================
// START (or find existing) conversation about a listing
// ==========================================

module.exports.startConversation = async (req, res) => {

    const { listingId } = req.params;

    const listing = await Listing.findById(listingId);

    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    if (listing.owner.equals(req.user._id)) {
        req.flash("error", "You can't message yourself about your own listing.");
        return res.redirect(`/listings/${listingId}`);
    }

    let conversation = await Conversation.findOne({
        listing: listingId,
        participants: { $all: [req.user._id, listing.owner] },
    });

    if (!conversation) {

        conversation = await Conversation.create({
            participants: [req.user._id, listing.owner],
            listing: listingId,
            lastMessage: "",
            lastMessageAt: new Date(),
        });

    }

    res.redirect(`/chat/${conversation._id}`);

};

// ==========================================
// SHOW a single conversation thread
// ==========================================

module.exports.showConversation = async (req, res) => {

    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
        .populate("participants", "username profileImage")
        .populate("listing", "title image");

    if (!conversation) {
        req.flash("error", "Conversation not found.");
        return res.redirect("/chat");
    }

    const isParticipant = conversation.participants.some(
        (p) => p._id.equals(req.user._id)
    );

    if (!isParticipant) {
        req.flash("error", "You don't have access to this conversation.");
        return res.redirect("/chat");
    }

    const messages = await Message.find({ conversation: conversationId })
        .populate("sender", "username profileImage")
        .sort({ createdAt: 1 });

    // Mark incoming messages as read
    await Message.updateMany(
        { conversation: conversationId, sender: { $ne: req.user._id }, read: false },
        { $set: { read: true } }
    );

    const otherUser = conversation.participants.find(
        (p) => !p._id.equals(req.user._id)
    );

    res.render("chat/conversation.ejs", {
        conversation,
        messages,
        otherUser,
    });

};