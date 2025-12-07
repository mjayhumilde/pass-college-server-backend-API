const express = require("express");
const messageController = require("../controller/messageController");
const conversationController = require("../controller/conversationController");
const authController = require("../controller/authController");

const router = express.Router();

// Protect all message routes
router.use(authController.protect);

// Conversations
router.get("/conversations", conversationController.getMyConversations);
router.get(
  "/conversations/:userId",
  conversationController.getOrCreateConversation
);

// Messages
router.post("/send", messageController.sendMessage);
router.get("/:userId", messageController.getMessages);
router.patch("/read/:id", messageController.markAsRead);

module.exports = router;
