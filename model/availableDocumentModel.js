const mongoose = require("mongoose");

const availableDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    requiresClearance: {
      type: Boolean,
      default: false,
    },
    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.requiresClearance === true;
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AvailableDocument", availableDocumentSchema);
