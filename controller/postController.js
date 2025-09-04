const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");

const Post = require("../model/postModel");
const factory = require("../controller/handlerFactory");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");

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

exports.getAllPost = catchAsync(async (req, res, next) => {
  let filter = {};

  console.log(req.user);

  // If the user is not authenticated, only allow 'news', 'events', 'careers' posts
  if (!req.user) {
    filter = {
      postType: { $in: ["news", "events", "careers"] }, // Filter to only allow specific post types for unauthenticated users
    };
  }

  // If the user is authenticated, allow access to all posts
  if (req.user) {
    filter = {}; // No filter, show all posts for authenticated users
  }

  // Use APIFeatures to handle query building for sorting, filtering, pagination, etc.
  const features = new APIFeatures(Post.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const posts = await features.query;

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: {
      posts,
    },
  });
});

// CRUD (factory pattern)
exports.createPost = factory.createOne(Post);
exports.deletePost = factory.deleteOne(Post);
exports.updatePost = factory.updateOne(Post);
exports.getPost = factory.getOne(Post);
