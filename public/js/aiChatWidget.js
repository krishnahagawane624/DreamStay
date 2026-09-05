// ==========================================
// AI Travel Assistant Chatbot — floating widget
// Appears on every page (mounted from boilerplate.ejs).
// If window.CURRENT_LISTING_ID is set (on a listing show page), the
// assistant is given that listing's details as context.
// ==========================================

(function () {

    const toggleBtn = document.getElementById("ai-chat-toggle-btn");
    const panel = document.getElementById("ai-chat-panel");
    const closeBtn = document.getElementById("ai-chat-close-btn");
    const messagesEl = document.getElementById("ai-chat-messages");
    const form = document.getElementById("ai-chat-form");
    const input = document.getElementById("ai-chat-input");
    const sendBtn = document.getElementById("ai-chat-send-btn");

    if (!toggleBtn || !panel || !form) return;

    // In-memory conversation history for this page session.
    let history = [];
    let sending = false;

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendMessage(role, text) {

        const bubble = document.createElement("div");
        bubble.className = "ai-chat-bubble ai-chat-bubble-" + (role === "user" ? "user" : "bot");
        bubble.textContent = text;

        messagesEl.appendChild(bubble);
        scrollToBottom();

        return bubble;

    }

    function appendTypingIndicator() {

        const bubble = document.createElement("div");
        bubble.className = "ai-chat-bubble ai-chat-bubble-bot ai-chat-typing";
        bubble.id = "ai-chat-typing-indicator";
        bubble.innerHTML = "<span></span><span></span><span></span>";

        messagesEl.appendChild(bubble);
        scrollToBottom();

    }

    function removeTypingIndicator() {

        const el = document.getElementById("ai-chat-typing-indicator");
        if (el) el.remove();

    }

    function openPanel() {

        panel.classList.add("open");
        toggleBtn.classList.add("active");
        input.focus();

        if (messagesEl.children.length === 0) {

            appendMessage(
                "bot",
                "Hi! I'm the DreamStay travel assistant. Ask me about this stay, packing tips, or anything travel-related."
            );

        }

    }

    function closePanel() {

        panel.classList.remove("open");
        toggleBtn.classList.remove("active");

    }

    toggleBtn.addEventListener("click", () => {

        if (panel.classList.contains("open")) {
            closePanel();
        } else {
            openPanel();
        }

    });

    if (closeBtn) {
        closeBtn.addEventListener("click", closePanel);
    }

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const message = input.value.trim();

        if (!message || sending) return;

        appendMessage("user", message);
        history.push({ role: "user", content: message });

        input.value = "";
        sending = true;
        sendBtn.disabled = true;
        appendTypingIndicator();

        try {

            const res = await fetch("/ai-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    history: history.slice(0, -1), // don't double-send the message just asked
                    listingId: window.CURRENT_LISTING_ID || null,
                }),
            });

            const data = await res.json();

            removeTypingIndicator();

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong.");
            }

            appendMessage("bot", data.reply);
            history.push({ role: "assistant", content: data.reply });

        } catch (err) {

            removeTypingIndicator();
            appendMessage("bot", "Sorry, I couldn't respond just now. Please try again in a moment.");
            console.error("AI chat widget error:", err);

        } finally {

            sending = false;
            sendBtn.disabled = false;
            input.focus();

        }

    });

})();