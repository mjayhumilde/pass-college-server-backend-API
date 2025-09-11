const crypto = require("crypto");
const multer = require("multer");

const Post = require("../model/postModel");
const factory = require("../controller/handlerFactory");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");
const cloudinary = require("../utils/cloudinary");

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

// Upload images to Cloudinary
exports.resizePostImages = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.images || req.files.images.length === 0)
    return next();

  req.body.images = [];

  for (let i = 0; i < req.files.images.length; i++) {
    const file = req.files.images[i];
    const filename = `post-${Date.now()}-${crypto.randomUUID()}`;

    // Upload buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "posts",
          public_id: filename,
          format: "jpeg",
          transformation: [{ width: 1200, crop: "limit" }], // limit size, keep aspect ratio
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    // Save secure URL in DB
    req.body.images.push(uploadResult.secure_url);
  }

  next();
});

exports.getAllPost = catchAsync(async (req, res, next) => {
  let filter = {};

  // If no authenticated user, limit what we return
  if (!req.user) {
    filter = { postType: { $in: ["news", "events", "careers"] } };
  }

  const features = new APIFeatures(Post.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const posts = await features.query;

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: { posts },
  });
});

// CRUD (factory pattern)
exports.createPost = factory.createOne(Post);
exports.deletePost = factory.deleteOne(Post);
exports.updatePost = factory.updateOne(Post);
exports.getPost = factory.getOne(Post);
