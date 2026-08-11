const mongoose = require("mongoose");
const validator = require("validator");

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    name: {
      type: String,
      trim: true,
      default: "Subscriber",
    },
    active: {
      type: Boolean,
      default: true,
    },
    unsubscribeToken: {
      type: String,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  },
);

const Subscriber = mongoose.model("Subscriber", subscriberSchema);
module.exports = Subscriber;
