const Conversation = require("../model/conversationModel");
const Message = require("../model/messageModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// Get or create a conversation between two users
exports.getOrCreateConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const otherUserId = req.params.userId;

  if (userId === otherUserId) {
    return next(
      new AppError("You cannot start a conversation with yourself.", 400)
    );
  }

  let convo = await Conversation.findOne({
    participants: { $all: [userId, otherUserId] },
  });

  if (!convo) {
    convo = await Conversation.create({
      participants: [userId, otherUserId],
    });
  }

  res.status(200).json({
    status: "success",
    data: convo,
  });
});

// Get all conversations for logged-in user
exports.getMyConversations = catchAsync(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: req.user.id,
  })
    .sort({ updatedAt: -1 })
    .populate("participants", "firstName lastName role photo");

  res.status(200).json({
    status: "success",
    results: conversations.length,
    data: conversations,
  });
});
