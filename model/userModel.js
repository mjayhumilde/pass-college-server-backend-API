const mongoose = require("mongoose");
const validator = require("validator");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "a user must have a First Name"],
    },
    lastName: {
      type: String,
      required: [true, "a user must have a Last Name"],
    },
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
      unique: true,
      required: [true, "a user must have a Email"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"], // custom validator using npm validate
    },
    studentNumber: {
      type: String,
      required: function () {
        return this.role === "student";
      },
      trim: true,
    },

    role: {
      type: String,
      default: "student",
      enum: ["student", "teacher", "admin", "registrar"],
    },
    photo: {
      type: String,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false, // will not show in getAllUser route
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      minlength: 8,
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Password are not the same!",
      },
    },
    passwordChangedAt: { type: Date },
    passwordResetToken: String,
    passwordResetExpires: { type: Date },
    active: {
      type: Boolean,
      default: true,
      select: false, // hide from API responses
    },
  },
  {
    timestamps: true,
  }
);

// Unique student number ONLY for active accounts
userSchema.index(
  { studentNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
  }
);

//Mongoose Middleware
//password encryption
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  //bcryt protect againts bruteforce attacks
  this.password = await bcrypt.hash(this.password, 12);

  //after hashing we need to remove the passswordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; //sometimes saving have delays
  next();
});

//Query Midlewawre
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().skipMiddleware) {
    this.find({ active: { $ne: false } });
  }
  next();
});

//Static methods
userSchema.statics.findOneWithInactive = function (filter) {
  return this.findOne(filter).setOptions({ skipMiddleware: true });
};

userSchema.statics.findAllWithInactive = function (filter = {}) {
  return this.find(filter).setOptions({ skipMiddleware: true });
};

//INSTANCE METHOD
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  //true
  if (this.passwordChangedAt) {
    const changeTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changeTimeStamp);

    return JWTTimestamp < changeTimeStamp;
  }
  //false
  return false;
};

//INSTANCE METHOD
userSchema.methods.createPasswordResetToken = function () {
  // generate random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 5 * 60 * 1000;

  // convert to Philippine Standard Time
  const expirationDate = new Date(this.passwordResetExpires);
  const philippinesTime = expirationDate.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
  });

  console.log(
    { resetToken },
    this.passwordResetToken,
    "PH TIME",
    philippinesTime
  );

  // send to email
  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
