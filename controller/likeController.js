const Like = require("../model/likeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getAllLikes = catchAsync(async (req, res, next) => {
  const filter = req.query.post ? { post: req.query.post } : {};

  const likes = await Like.find(filter).populate(
    "user",
    "firstName lastName photo course"
  );

  res.status(200).json({
    status: "success",
    results: likes.length,
    data: { likes },
  });
});

exports.getOneLike = catchAsync(async (req, res, next) => {
  const like = await Like.findById(req.params.id).populate(
    "user",
    "firstName lastName photo course"
  );

  if (!like) return next(new AppError("Like not found", 404));

  res.status(200).json({ status: "success", data: { like } });
});

exports.createLike = catchAsync(async (req, res, next) => {
  const { post } = req.body;

  if (!post) return next(new AppError("Post ID is required", 400));

  // Prevent duplicate like
  const existingLike = await Like.findOne({ post, user: req.user.id });
  if (existingLike)
    return next(new AppError("You already liked this post", 400));

  const like = await Like.create({ post, user: req.user.id });

  res.status(201).json({ status: "success", data: { like } });
});

exports.deleteLike = catchAsync(async (req, res, next) => {
  const like = await Like.findById(req.params.id);

  if (!like) return next(new AppError("Like not found", 404));

  if (like.user.toString() !== req.user.id)
    return next(new AppError("You can only remove your own like", 403));

  await Like.findByIdAndDelete(req.params.id);

  res.status(204).json({ status: "success", data: null });
});
