const mongoose = require("mongoose");
const validator = require("validator");

const accountRequestSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, "First name is required"] },
    lastName: { type: String, required: [true, "Last name is required"] },
    course: {
      type: String,
      enum: ["BSCS", "BSA", "BSBA", "BSHM", "BSTM", "BSCRIM", "BEED", "none"],
      required: function () {
        return this.role === "student"; // only required for students
      },
      default: "none",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      unique: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    registrationFormImages: {
      front: { type: String, required: true },
      back: { type: String, required: true },
    },
    role: {
      type: String,
      enum: ["student", "registrar", "admin", "teacher"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    rejectionReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Account-Request", accountRequestSchema);
