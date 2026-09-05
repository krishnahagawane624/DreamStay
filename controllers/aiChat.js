const Listing = require("../models/listing");
const { chatWithAssistant } = require("../util/aiClient");

// ==========================================
// AI TRAVEL ASSISTANT CHATBOT
// POST /ai-chat
// Body: { message, history: [{role, content}], listingId? }
// ==========================================

module.exports.chat = async (req, res) => {

    const { message, history, listingId } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required." });
    }

    if (message.length > 1000) {
        return res.status(400).json({ error: "Message is too long." });
    }

    let listingContext = null;

    if (listingId) {

        try {

            listingContext = await Listing.findById(listingId)
                .select("title description price location country category amenities maxGuests bedrooms");

        } catch (err) {
            // Bad/unknown listing id — just chat without context.
            listingContext = null;
        }

    }

    try {

        const reply = await chatWithAssistant({
            message: message.trim(),
            history: Array.isArray(history) ? history : [],
            listingContext,
        });

        res.json({ reply });

    } catch (err) {

        console.log("AI chat error:", err.message);
        res.status(500).json({ error: "The assistant is unavailable right now. Please try again." });

    }

};