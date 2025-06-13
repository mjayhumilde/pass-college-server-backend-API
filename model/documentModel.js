const mongoose = require("mongoose");

const developmentUser = {
  name: "Mark John Humilde",
  course: "BSCS",
};

const documentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: [true, "a document request must have a type"],
      index: true,
      // add enum in the future
    },
    documentStatus: {
      type: String,
      default: "processing",
      enum: ["processing", "ready-to-pickup", "pick-up"],
      index: true,
    },
    user: {
      name: {
        type: String,
        default: developmentUser.name,
        required: true,
      },
      course: {
        type: String,
        default: developmentUser.course,
        required: true,
      },
    }, //add populate in the future once user model is created
    dateRequest: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model("Documents", documentSchema);

module.exports = Document;
