const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");

const Post = require("../model/postModel");
const factory = require("../controller/handlerFactory");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// === Multer config ===
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new AppError("Not an image! Please upload only images.", 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    files: Number(process.env.POST_MAX_IMAGES || 10), // safer default
    fileSize: Number(process.env.POST_IMAGE_MAX_BYTES || 5 * 1024 * 1024), // 5MB each
  },
});

// Accept field `images` as an array
exports.uploadPostImages = upload.fields([
  { name: "images", maxCount: Number(process.env.POST_MAX_IMAGES || 10) },
]);

// Ensure output dir exists once
const IMAGES_DIR = path.join(__dirname, "..", "public", "img", "posts");
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// save images; attach filenames to req.body.images
exports.resizePostImages = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.images || req.files.images.length === 0)
    return next();

  req.body.images = [];

  // Process sequentially to reduce CPU spikes
  for (let i = 0; i < req.files.images.length; i++) {
    const file = req.files.images[i];
    const filename = `post-${Date.now()}-${crypto.randomUUID()}.jpeg`;
    const outputPath = path.join(IMAGES_DIR, filename);

    await sharp(file.buffer)
      .toFormat("jpeg")
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(outputPath);

    // Save relative URL you can serve in React
    req.body.images.push(`/img/posts/${filename}`);
  }

  next();
});

// CRUD (factory pattern)
exports.getAllPost = factory.getAll(Post);
exports.createPost = factory.createOne(Post);
exports.deletePost = factory.deleteOne(Post);
exports.updatePost = factory.updateOne(Post);
exports.getPost = factory.getOne(Post);
