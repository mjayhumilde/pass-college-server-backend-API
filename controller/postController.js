const crypto = require("crypto");
const multer = require("multer");

const Post = require("../model/postModel");
const Like = require("../model/likeModel");
const Comment = require("../model/commentModel");
const Notification = require("../model/notificationModel");
const User = require("../model/userModel");
const factory = require("../controller/handlerFactory");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/apiFeatures");
const cloudinary = require("../utils/cloudinary");
const Email = require("../utils/Email");

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

exports.createPost = catchAsync(async (req, res, next) => {
  req.body.user = req.user.id;
  const post = await Post.create(req.body);

  const recipients = await User.find({
    role: { $in: ["student", "teacher"] },
    _id: { $ne: req.user.id }, // exclude the post creator
  }).select("_id");

  const notifications = recipients.map((user) => ({
    title: `New ${post.postType} posted`,
    description: post.description.substring(0, 100) + "...",
    postType: post.postType,
    user: user._id,
    relatedPost: post._id,
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  //email notification
  try {
    const url = `https://pass-college.netlify.app/`;

    // user details for email sending
    const emailRecipients = await User.find({
      role: { $in: ["student", "teacher"] },
      _id: { $ne: req.user.id },
    }).select("email firstName");

    for (const user of emailRecipients) {
      await new Email(user, url).sendNewPostCreated(
        post.title,
        post.postType,
        url
      );
    }

    console.log("📨 Post email sent to all users");
  } catch (err) {
    console.error("❌ Post Email Failed:", err);
  }

  res.status(201).json({
    status: "success",
    data: { post },
  });
});

// CRUD (factory pattern)
exports.deletePost = factory.deleteOne(Post);
exports.updatePost = factory.updateOne(Post);
