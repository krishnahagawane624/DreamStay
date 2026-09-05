// Requires the page to define window.CHAT_CONVERSATION_ID and window.CHAT_CURRENT_USER_ID
// before this script runs (see views/chat/conversation.ejs)

const socket = io();

const conversationId = window.CHAT_CONVERSATION_ID;
const currentUserId = window.CHAT_CURRENT_USER_ID;

const messagesBox = document.getElementById("chat-messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");

socket.emit("joinConversation", conversationId);

function scrollToBottom() {
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

function appendMessage(msg) {

    const isMine = msg.sender._id === currentUserId;

    const wrapper = document.createElement("div");
    wrapper.className = "chat-bubble-row " + (isMine ? "mine" : "theirs");

    const time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    wrapper.innerHTML = `
        <div class="chat-bubble">
            <div class="chat-bubble-text"></div>
            <div class="chat-bubble-time">${time}</div>
        </div>
    `;

    wrapper.querySelector(".chat-bubble-text").textContent = msg.content;

    messagesBox.appendChild(wrapper);
    scrollToBottom();

}

socket.on("newMessage", (msg) => {
    appendMessage(msg);
});

if (form) {

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const text = input.value.trim();

        if (!text) return;

        socket.emit("sendMessage", { conversationId, text });

        input.value = "";
        input.focus();

    });

}

scrollToBottom();