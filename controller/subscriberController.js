const crypto = require("crypto");
const Subscriber = require("../model/subscriberModel");
const Email = require("../utils/Email");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllSubscribers = catchAsync(async (req, res, next) => {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: subscribers.length,
    data: { subscribers },
  });
});

exports.addSubscriber = catchAsync(async (req, res, next) => {
  const { email, name } = req.body;

  const unsubscribeToken = crypto.randomBytes(32).toString("hex");

  const subscriber = await Subscriber.create({
    email,
    name,
    unsubscribeToken,
  });

  res.status(201).json({
    status: "success",
    data: { subscriber },
  });
});

exports.deleteSubscriber = catchAsync(async (req, res, next) => {
  const subscriber = await Subscriber.findByIdAndDelete(req.params.id);

  if (!subscriber) {
    return next(new AppError("No subscriber found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.unsubscribe = catchAsync(async (req, res, next) => {
  const subscriber = await Subscriber.findOneAndUpdate(
    { unsubscribeToken: req.params.token },
    { active: false },
    { new: true },
  );

  if (!subscriber) {
    return next(new AppError("Invalid unsubscribe link", 400));
  }

  res.status(200).json({
    status: "success",
    message: "You have been unsubscribed successfully",
  });
});

exports.sendNewsletter = catchAsync(async (req, res, next) => {
  const { subject, blocks } = req.body;

  if (!subject || !blocks || !blocks.length) {
    return next(new AppError("Subject and content blocks are required", 400));
  }

  // Get all active subscribers
  const subscribers = await Subscriber.find({ active: true });

  if (!subscribers.length) {
    return next(new AppError("No active subscribers found", 404));
  }

  const failed = [];

  await Promise.allSettled(
    subscribers.map(async (subscriber) => {
      try {
        const unsubscribeURL = `${process.env.FRONTEND_URL}/unsubscribe/${subscriber.unsubscribeToken}`;

        await new Email(
          { email: subscriber.email, firstName: subscriber.name },
          unsubscribeURL,
        ).sendNewsletter(subject, blocks, unsubscribeURL);
      } catch (err) {
        failed.push(subscriber.email);
        console.error(`Failed to send to ${subscriber.email}:`, err.message);
      }
    }),
  );

  res.status(200).json({
    status: "success",
    message: `Newsletter sent to ${subscribers.length - failed.length} subscribers`,
    failed: failed.length ? failed : undefined,
  });
});
