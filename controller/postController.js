const crypto = require("crypto");
const multer = require("multer");

const Post = require("../model/postModel");
const Like = require("../model/likeModel");
const Comment = require("../model/commentModel");
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

  let posts = await features.query;

  posts = await Promise.all(
    posts.map(async (post) => {
      const likeCount = await Like.countDocuments({ post: post._id });

      const latestComments = await Comment.find({ post: post._id })
        .sort("-createdAt")
        .limit(3)
        .populate("user", "firstName lastName photo course");

      return {
        ...post.toObject(),
        likeCount,
        latestComments,
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: posts.length,
    data: { posts },
  });
});

exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return next(new AppError("No post found with that ID", 404));
  }

  const likeCount = await Like.countDocuments({ post: post._id });

  const comments = await Comment.find({ post: post._id })
    .sort("-createdAt")
    .limit(3)
    .populate("user", "firstName lastName photo course");

  res.status(200).json({
    status: "success",
    data: {
      post: {
        ...post.toObject(),
        likeCount,
        comments,
      },
    },
  });
});

// CRUD (factory pattern)
exports.createPost = factory.createOne(Post);
exports.deletePost = factory.deleteOne(Post);
exports.updatePost = factory.updateOne(Post);
