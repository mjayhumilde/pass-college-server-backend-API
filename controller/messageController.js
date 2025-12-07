const Message = require("../model/messageModel");
const Conversation = require("../model/conversationModel");
const User = require("../model/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// CHAT RULES
function validateMessagingRules(senderRole, receiverRole) {
  // Current rule anyone can message anyone
  // If future rules needed
  return true;
}

// SEND MESSAGE
exports.sendMessage = catchAsync(async (req, res, next) => {
  const senderId = req.user.id;
  const { receiverId, message } = req.body;

  if (!receiverId || !message) {
    return next(new AppError("receiverId and message are required.", 400));
  }

  if (senderId === receiverId) {
    return next(new AppError("You cannot message yourself.", 400));
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return next(new AppError("Receiver not found.", 404));
  }

  //  Apply Role Rules
  validateMessagingRules(req.user.role, receiver.role);

  // Find/create conversation
  let convo = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!convo) {
    convo = await Conversation.create({
      participants: [senderId, receiverId],
    });
  }

  const newMessage = await Message.create({
    sender: senderId,
    receiver: receiverId,
    message,
  });

  // Update conversation preview
  convo.lastMessage = message;
  convo.lastMessageAt = Date.now();
  await convo.save();

  res.status(201).json({
    status: "success",
    data: newMessage,
  });
});

// GET CHAT HISTORY BETWEEN TWO USERS
exports.getMessages = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const otherUserId = req.params.userId;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  }).sort({ createdAt: 1 });

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: messages,
  });
});

// MARK MESSAGE AS READ
exports.markAsRead = catchAsync(async (req, res, next) => {
  const msgId = req.params.id;

  const message = await Message.findById(msgId);

  if (!message) return next(new AppError("Message not found", 404));

  if (message.receiver.toString() !== req.user.id) {
    return next(
      new AppError("You can only mark your own received messages.", 403)
    );
  }

  message.read = true;
  await message.save();

  res.status(200).json({
    status: "success",
    message: "Message marked as read",
  });
});
