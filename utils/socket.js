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

    // NO DB save || prevents duplicate message bug
    socket.on("notify_receiver", ({ receiverId, message }) => {
      if (!receiverId || !message) return;

      // Forward the already-saved message object to the receiver only
      io.to(receiverId).emit("new_message", message);
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
