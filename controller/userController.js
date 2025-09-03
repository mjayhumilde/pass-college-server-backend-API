const User = require("../model/userModel");
const factory = require("../controller/handlerFactory");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Email = require("../utils/Email");

const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// === Multer Config for Users ===
const multerStorage = multer.memoryStorage(); // keep in memory for sharp
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
    fileSize: 2 * 1024 * 1024, // 2MB per photo (profile pic usually small)
  },
});

// Middleware to accept single file under "photo" field
exports.uploadUserPhoto = upload.single("photo");

// Ensure user photo dir exists
const USER_IMG_DIR = path.join(__dirname, "..", "public", "img", "users");
if (!fs.existsSync(USER_IMG_DIR))
  fs.mkdirSync(USER_IMG_DIR, { recursive: true });

// Resize + Save
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  const outputPath = path.join(USER_IMG_DIR, filename);

  await sharp(req.file.buffer)
    .resize(500, 500) // square crop for profile pic
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  // Attach filename to req.body so updateMe can use it
  req.body.photo = `/img/users/${filename}`;

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
  // 1) Error if trying to update password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names
  const filteredBody = filterObject(
    req.body,
    "firstName",
    "lastName",
    "course",
    "email",
    "photo"
  );

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    updatedUser,
  });
});

// This route is for ADMIN/TEACHER role to create a student accounts
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

  // because i created a hash mongoose middleware and i want to send a unhash password to email
  const defaultPasswordForEmail = password;

  // Basic validation
  if (!email || !password || !firstName || !lastName) {
    return next(new AppError("Please provide all required user details.", 400));
  }

  // Create the user
  const newUser = await User.create({
    firstName,
    lastName,
    email,
    password,
    passwordConfirm,
    course,
    role: role || "student",
  });

  // const url = `${req.protocol}://${req.get("host")}api/v1/user/login`;
  const url = "https://pass-college.netlify.app/"; // for dev || testing
  await new Email(newUser, url).sendWelcome(
    newUser.email,
    defaultPasswordForEmail
  );

  // Remove password from output before sending response
  newUser.password = undefined;

  res.status(201).json({
    status: "success",
    data: {
      user: newUser,
    },
    message: "User created successfully by admin/teacher.",
  });
});

exports.getAllUser = factory.getAll(User);
exports.getOneUser = factory.getOne(User);

//Do NOT update password with this | because of findById Querry in factory
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
