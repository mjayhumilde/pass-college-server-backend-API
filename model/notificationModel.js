const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notification must have a title"],
    },
    description: {
      type: String,
      required: [true, "Notification must have a description"],
    },
    postType: {
      type: String,
      enum: ["announcement", "news", "events", "uniforms-update", "careers"],
      required: [true, "Notification must have a type"],
    },
    notifStatus: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    relatedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentRequest",
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
