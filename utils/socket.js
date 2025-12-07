const Message = require("../model/messageModel");
const Conversation = require("../model/conversationModel");

let onlineUsers = new Map();

module.exports = (io) => {
  io.on("connection", (socket) => {
    // USER CONNECTS & JOINS SOCKET ROOM
    socket.on("join", (userId) => {
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      socket.join(userId);

      console.log("User connected:", userId);
    });

    // SEND PRIVATE MESSAGE
    socket.on("private_message", async ({ senderId, receiverId, message }) => {
      if (!senderId || !receiverId || !message) return;

      // Save message DB
      const newMessage = await Message.create({
        sender: senderId,
        receiver: receiverId,
        message,
      });

      // Update convo preview
      let convo = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] },
      });

      if (!convo) {
        convo = await Conversation.create({
          participants: [senderId, receiverId],
        });
      }

      convo.lastMessage = message;
      convo.lastMessageAt = Date.now();
      await convo.save();

      // Emit to receiver (if online)
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverId).emit("new_message", newMessage);
      }

      // Emit to sender also (to update UI)
      io.to(senderId).emit("message_sent", newMessage);
    });

    // MARK MESSAGE AS READ
    socket.on("message_read", async ({ messageId, readerId }) => {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      msg.read = true;
      await msg.save();

      // Notify sender their message was read
      io.to(msg.sender.toString()).emit("message_read_update", {
        messageId: msg._id,
      });
    });

    // USER DISCONNECTS
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        console.log("User disconnected:", socket.userId);
      }
    });
  });
};
