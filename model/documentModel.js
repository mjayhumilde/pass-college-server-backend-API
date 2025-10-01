const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: [true, "A document request must have a type"],
      trim: true,
      index: true,
      // add enum later
    },
    documentStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "ready-to-pickup",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A document request must belong to a user"],
    },
    dateRequest: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);
module.exports = Document;
