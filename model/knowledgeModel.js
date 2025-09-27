const mongoose = require("mongoose");

const knowledgeSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // store vector embeddings for semantic search
    embedding: {
      type: [Number],
      required: true,
      index: "2dsphere",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Knowledge", knowledgeSchema);
