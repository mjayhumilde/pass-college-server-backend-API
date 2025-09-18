const Notification = require("../model/notificationModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

//  Create a new notification
exports.createNotification = async ({
  user,
  title,
  description,
  postType,
  relatedPost,
  relatedDocument,
}) => {
  try {
    const notification = await Notification.create({
      user,
      title,
      description,
      postType,
      relatedPost,
      relatedDocument,
    });

    return notification;
  } catch (err) {
    throw new AppError(err.message || "Error creating notification", 500);
  }
};

exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const filter = { user: req.user.id };

  if (req.query.postType) {
    filter.postType = req.query.postType;
  }

  const notifications = await Notification.find(filter).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: {
      notifications,
    },
  });
});

//  Mark a single notification as read
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { notifStatus: "read" },
    { new: true, runValidators: true }
  );

  if (!notification) {
    return next(new AppError("No notification found with that ID.", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      notification,
    },
  });
});

//  Mark all user notifications as read
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user.id, notifStatus: "unread" },
    { notifStatus: "read" }
  );

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});

//  Delete a single notification
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!notification) {
    return next(new AppError("No notification found with that ID.", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

//  Delete all notifications
exports.deleteAllMyNotifications = catchAsync(async (req, res, next) => {
  await Notification.deleteMany({ user: req.user.id });

  res.status(204).json({
    status: "success",
    data: null,
  });
});
