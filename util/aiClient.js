// Minimal Google Gemini client using Node's built-in fetch
// (no extra npm package required — Node 18+ ships fetch globally).
//
// Requires GEMINI_API_KEY in your .env file. Get a free key (no card
// required) at https://aistudio.google.com/apikey
//
// If Google ever renames/retires this model, override it without touching
// code by setting GEMINI_MODEL in your .env.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function requireApiKey() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY in your .env file.");
    }
}

// Low-level helper — calls generateContent for a given model with a system
// instruction + conversation contents, and returns the raw text reply.
async function callGemini({ systemPrompt, contents, jsonMode = false, temperature = 0.7, maxOutputTokens }) {

    requireApiKey();

    const generationConfig = { temperature };

    if (jsonMode) {
        generationConfig.responseMimeType = "application/json";
    }

    if (maxOutputTokens) {
        generationConfig.maxOutputTokens = maxOutputTokens;
    }

    const body = {
        contents,
        generationConfig,
    };

    if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetch(
        `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();

    if (!text) {

        // Most common reason this is empty: the response was blocked by
        // Gemini's safety filters instead of actually failing.
        const blockReason = data.promptFeedback?.blockReason;

        if (blockReason) {
            throw new Error(`Gemini blocked the request (${blockReason}).`);
        }

        throw new Error("Gemini returned an empty response.");

    }

    return text;

}

async function generateTripPlan({ city, days, budget, people }) {

    const systemPrompt = `You are a travel planning assistant for a booking platform called DreamStay.
Given a trip's city, number of days, total budget (in INR), and number of travellers,
return STRICT JSON only (no markdown, no code fences, no extra text) in exactly this shape:

{
  "summary": "one short paragraph overview of the trip plan",
  "itinerary": [
    { "day": 1, "title": "short title for the day", "activities": ["activity 1", "activity 2", "activity 3"] }
  ],
  "budgetTips": "one short paragraph of budget-saving advice for this trip"
}

Make the itinerary exactly ${days} days long. Keep each day's activities realistic, locally
relevant to the city given, and appropriate for the budget and number of travellers. Do not
mention specific hotel or listing names since those are matched separately.`;

    const userPrompt = `City: ${city}
Number of days: ${days}
Total budget: ₹${budget}
Number of travellers: ${people}`;

    const raw = await callGemini({
        systemPrompt,
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        jsonMode: true,
        temperature: 0.7,
    });

    let parsed;

    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error("Couldn't parse the AI's response as JSON.");
    }

    return parsed;

}

async function generateListingDescription({ title, category, location, country, price, amenities }) {

    const systemPrompt = `You are a copywriter for a property booking platform called DreamStay.
Write a warm, inviting listing description of 3-5 sentences (plain text, no markdown, no headings,
no bullet points) for a property with the details given by the user. Highlight what makes the
property appealing without inventing amenities or facts that weren't provided. Do not include
the price in the description text itself.`;

    const detailLines = [
        `Title: ${title}`,
        category ? `Category: ${category}` : null,
        `Location: ${location}, ${country}`,
        `Price per night: ₹${price}`,
        amenities ? `Notable amenities: ${amenities}` : null,
    ].filter(Boolean).join("\n");

    const description = await callGemini({
        systemPrompt,
        contents: [{ role: "user", parts: [{ text: detailLines }] }],
        temperature: 0.7,
    });

    return description;

}

// Downloads the image bytes and base64-encodes them — Gemini's vision input
// needs inline image data rather than a bare URL.
async function fetchImageAsInlineData(imageUrl) {

    const imgRes = await fetch(imageUrl);

    if (!imgRes.ok) {
        throw new Error(`Couldn't download image for captioning (${imgRes.status}).`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

    return { mimeType, base64Data };

}

async function generateImageCaption(imageUrl) {

    requireApiKey();

    const { mimeType, base64Data } = await fetchImageAsInlineData(imageUrl);

    const caption = await callGemini({
        systemPrompt: "You caption property photos for a booking platform. Reply with ONLY a short caption (max 8 words, no punctuation at the end, no quotes) describing what's shown.",
        contents: [
            {
                role: "user",
                parts: [
                    { text: "Caption this photo." },
                    { inlineData: { mimeType, data: base64Data } },
                ],
            },
        ],
        temperature: 0.5,
        maxOutputTokens: 30,
    });

    return caption || null;

}

async function chatWithAssistant({ message, history = [], listingContext = null }) {

    let systemPrompt = `You are the DreamStay Travel Assistant — a friendly, concise chatbot embedded on a
property booking platform called DreamStay. You help visitors with travel planning questions,
what to pack, local tips, and general questions about booking a stay. Keep replies short
(2-4 sentences unless a list is genuinely needed) and plain text — no markdown headers. If asked
something you can't know (like real-time availability or exact prices beyond what's given to you),
say so plainly and suggest checking the listing page or contacting the host.`;

    if (listingContext) {

        systemPrompt += `\n\nThe visitor is currently viewing this listing, so prefer answering with it in mind
when relevant:
Title: ${listingContext.title}
Category: ${listingContext.category || "N/A"}
Location: ${listingContext.location}, ${listingContext.country}
Price per night: ₹${listingContext.price}
Max guests: ${listingContext.maxGuests || "N/A"}
Bedrooms: ${listingContext.bedrooms || "N/A"}
Amenities: ${(listingContext.amenities && listingContext.amenities.length) ? listingContext.amenities.join(", ") : "N/A"}
Description: ${listingContext.description || "N/A"}`;

    }

    // Cap history so the request stays small — last 10 turns is plenty of context.
    // Gemini uses "model" instead of "assistant" for the AI's turns.
    const trimmedHistory = (history || [])
        .filter(turn => turn && turn.role && turn.content)
        .slice(-10)
        .map(turn => ({
            role: turn.role === "assistant" || turn.role === "model" ? "model" : "user",
            parts: [{ text: String(turn.content).slice(0, 2000) }],
        }));

    const reply = await callGemini({
        systemPrompt,
        contents: [
            ...trimmedHistory,
            { role: "user", parts: [{ text: message }] },
        ],
        temperature: 0.6,
        maxOutputTokens: 300,
    });

    return reply;

}

module.exports = {
    generateTripPlan,
    generateListingDescription,
    generateImageCaption,
    chatWithAssistant,
};