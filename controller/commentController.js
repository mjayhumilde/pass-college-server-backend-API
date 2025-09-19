const Comment = require("../model/commentModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.filterCommentsByPost = (req, res, next) => {
  if (req.query.post) {
    req.filter = { post: req.query.post };
  } else {
    req.filter = {};
  }
  next();
};

exports.getAllComments = catchAsync(async (req, res, next) => {
  const comments = await Comment.find(req.filter)
    .populate("user", "firstName lastName course photo role")
    .populate("parentComment", "text user"); // optional show parent comment

  res.status(200).json({
    status: "success",
    results: comments.length,
    data: { comments },
  });
});

exports.getOneComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id)
    .populate("user", "firstName lastName course photo role")
    .populate("parentComment", "text user");

  if (!comment) return next(new AppError("Comment not found", 404));

  res.status(200).json({ status: "success", data: { comment } });
});

exports.createComment = catchAsync(async (req, res, next) => {
  req.body.user = req.user.id;

  // Optional ensure parentComment belongs to same post
  if (req.body.parentComment) {
    const parent = await Comment.findById(req.body.parentComment);
    if (!parent)
      return next(new AppError("Parent comment does not exist", 400));
    if (parent.post.toString() !== req.body.post)
      return next(
        new AppError("Parent comment must belong to the same post", 400)
      );
  }

  const comment = await Comment.create(req.body);

  res.status(201).json({ status: "success", data: { comment } });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) return next(new AppError("Comment not found", 404));

  if (comment.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to update this comment", 403)
    );
  }

  // Only allow updating text
  comment.text = req.body.text || comment.text;
  await comment.save();

  res.status(200).json({ status: "success", data: { comment } });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) return next(new AppError("Comment not found", 404));

  if (comment.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to delete this comment", 403)
    );
  }

  await Comment.findByIdAndDelete(req.params.id);

  res.status(204).json({ status: "success", data: null });
});
