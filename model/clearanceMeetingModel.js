const mongoose = require("mongoose");

const clearanceMeetingSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      unique: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: String,
      required: true,
    },
    meetingDate: {
      type: Date,
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClearanceMeeting", clearanceMeetingSchema);
