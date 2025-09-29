const User = require("../model/userModel");
const factory = require("../controller/handlerFactory");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Email = require("../utils/Email");

const multer = require("multer");
const cloudinary = require("../utils/cloudinary");

// === Multer Config for Users ===
const multerStorage = multer.memoryStorage(); // keep file in memory for Cloudinary
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB per photo
  },
});

// Middleware to accept single file under "photo" field
exports.uploadUserPhoto = upload.single("photo");

// Upload to Cloudinary
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "users",
        format: "jpeg",
        transformation: [{ width: 500, height: 500, crop: "fill" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(req.file.buffer);
  });

  // Attach secure URL to req.body so it gets saved in DB
  req.body.photo = uploadResult.secure_url;

  next();
});

const filterObject = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  const filteredBody = filterObject(
    req.body,
    "firstName",
    "lastName",
    "course",
    "email",
    "photo"
  );

  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    updatedUser,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    course,
    passwordConfirm,
  } = req.body;

  const defaultPasswordForEmail = password;

  if (!email || !password || !firstName || !lastName) {
    return next(new AppError("Please provide all required user details.", 400));
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    course,
    role: role || "student",
  });

  const url = "https://pass-college.netlify.app/";
  await new Email(newUser, url).sendWelcome(
    newUser.email,
    defaultPasswordForEmail
  );

  newUser.password = undefined;

  res.status(201).json({
    status: "success",
    data: {
      user: newUser,
    },
    message: "User created successfully by admin/teacher.",
  });
});

// Get all deactivated users
exports.getAllDeactivatedUsers = catchAsync(async (req, res, next) => {
  const deactivatedUsers = await User.findWithInactive({ active: false });

  res.status(200).json({
    status: "success",
    results: deactivatedUsers.length,
    data: {
      users: deactivatedUsers,
    },
  });
});

// Deactivate user
exports.deactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true, runValidators: true }
  );

  if (!user) return next(new AppError("No user found with that ID", 404));

  res.status(200).json({
    status: "success",
    message: "User deactivated successfully",
  });
});

// Reactivate user
exports.reactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { active: true },
    { new: true, runValidators: true, skipMiddleware: true } //  bypass middleware
  );

  if (!user) return next(new AppError("No user found with that ID", 404));

  res.status(200).json({
    status: "success",
    message: "User reactivated successfully",
  });
});

exports.getAllUser = factory.getAll(User);
exports.getOneUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
