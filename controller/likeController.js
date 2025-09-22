const Like = require("../model/likeModel");
const Notification = require("../model/notificationModel");
const User = require("../model/userModel");
const Post = require("../model/postModel");
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

  // Prevent duplicate
  const existingLike = await Like.findOne({ post, user: req.user.id });
  if (existingLike)
    return next(new AppError("You already liked this post", 400));

  const like = await Like.create({ post, user: req.user.id });

  // Notify registrar
  const registrars = await User.find({ role: "registrar" }).select("_id");
  if (registrars.length > 0) {
    const postDoc = await Post.findById(post).select("title postType");
    const likeCount = await Like.countDocuments({ post });

    const description =
      likeCount === 1
        ? `${likeCount} user liked ${postDoc?.title || "a post"}`
        : `${likeCount} users liked ${postDoc?.title || "a post"}`;

    // Upsert notifications overwrite for each registrar per post
    await Promise.all(
      registrars.map((registrar) =>
        Notification.findOneAndUpdate(
          { user: registrar._id, relatedPost: post, title: "Post Likes" },
          {
            title: "Post Likes",
            description,
            postType: postDoc?.postType || "announcement",
            user: registrar._id,
            relatedPost: post,
            notifStatus: "unread", // always reset to unread
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );
  }

  res.status(201).json({ status: "success", data: { like } });
});

exports.deleteLike = catchAsync(async (req, res, next) => {
  const like = await Like.findById(req.params.id);

  if (!like) return next(new AppError("Like not found", 404));

  if (like.user.toString() !== req.user.id)
    return next(new AppError("You can only remove your own like", 403));

  const postId = like.post; // keep reference before deleting
  await Like.findByIdAndDelete(req.params.id);

  // Update registrar notifications
  const registrars = await User.find({ role: "registrar" }).select("_id");
  if (registrars.length > 0) {
    const postDoc = await Post.findById(postId).select("title postType");
    const likeCount = await Like.countDocuments({ post: postId });

    if (likeCount > 0) {
      const description =
        likeCount === 1
          ? `${likeCount} user liked ${postDoc?.title || "a post"}`
          : `${likeCount} users liked ${postDoc?.title || "a post"}`;

      // Update each registrar's notif for that post
      await Promise.all(
        registrars.map((registrar) =>
          Notification.findOneAndUpdate(
            { user: registrar._id, relatedPost: postId, title: "Post Likes" },
            {
              title: "Post Likes",
              description,
              postType: postDoc?.postType || "announcement",
              user: registrar._id,
              relatedPost: postId,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
        )
      );
    } else {
      // if no likes left remove the notification
      await Notification.deleteMany({
        relatedPost: postId,
        title: "Post Likes",
      });
    }
  }

  res.status(204).json({ status: "success", data: null });
});
