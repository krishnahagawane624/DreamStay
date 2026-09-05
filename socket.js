const { Server } = require("socket.io");
const Message = require("./models/message");
const Conversation = require("./models/conversation");

// Wraps an Express middleware so Socket.io can run it on every connection.
// This is how the socket "sees" req.session / req.user, using the exact
// same session cookie the browser already sent for normal HTTP requests.
function wrap(middleware) {
    return (socket, next) => middleware(socket.request, {}, next);
}

module.exports.initSocket = function (server, sessionMiddleware, passport) {

    const io = new Server(server);

    io.use(wrap(sessionMiddleware));
    io.use(wrap(passport.initialize()));
    io.use(wrap(passport.session()));

    // Reject any socket connection that isn't logged in
    io.use((socket, next) => {

        if (socket.request.user) {
            return next();
        }

        next(new Error("Unauthorized"));

    });

    io.on("connection", (socket) => {

        const currentUser = socket.request.user;

        // Client joins the "room" for the conversation it's viewing
        socket.on("joinConversation", async (conversationId) => {

            // Basic authorization: only join if you're actually a participant
            const conversation = await Conversation.findById(conversationId);

            if (!conversation) return;

            const isParticipant = conversation.participants.some(
                (p) => p.toString() === currentUser._id.toString()
            );

            if (!isParticipant) return;

            socket.join(conversationId);

        });

        // Client sends a new message
        socket.on("sendMessage", async ({ conversationId, text }) => {

            if (!text || !text.trim()) return;

            const conversation = await Conversation.findById(conversationId);

            if (!conversation) return;

            const isParticipant = conversation.participants.some(
                (p) => p.toString() === currentUser._id.toString()
            );

            if (!isParticipant) return;

            const message = await Message.create({
                conversation: conversationId,
                sender: currentUser._id,
                content: text.trim(),
            });

            conversation.lastMessage = text.trim();
            conversation.lastMessageAt = new Date();
            await conversation.save();

            io.to(conversationId).emit("newMessage", {
                _id: message._id,
                content: message.content,
                sender: {
                    _id: currentUser._id,
                    username: currentUser.username,
                },
                createdAt: message.createdAt,
            });

        });

    });

    return io;

};
