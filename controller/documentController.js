const Document = require("../model/documentModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");

exports.restrictStudentUpdateDelete = catchAsync(async (req, res, next) => {
  if (req.user.role === "student") {
    return next(
      new AppError(
        "Students are not allowed to update or delete requests.",
        403
      )
    );
  }
  next();
});

exports.createDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.create({
    ...req.body,
    requestedBy: req.user.id,
  });

  res.status(201).json({
    status: "success",
    data: { doc },
  });
});

exports.getMyDocuments = catchAsync(async (req, res, next) => {
  const docs = await Document.find({ requestedBy: req.user.id }).sort(
    "-createdAt"
  );

  res.status(200).json({
    status: "success",
    results: docs.length,
    data: { docs },
  });
});

exports.deleteMyDocument = catchAsync(async (req, res, next) => {
  const doc = await Document.findById(req.params.id);

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  if (doc.requestedBy._id.toString() !== req.user.id) {
    return next(
      new AppError("You are not allowed to delete this request", 403)
    );
  }

  if (doc.documentStatus !== "pending") {
    return next(
      new AppError("You cannot delete a request once it is processing", 400)
    );
  }

  await Document.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.updateDocumentStatus = catchAsync(async (req, res, next) => {
  const { status, cancelReason } = req.body;

  const doc = await Document.findById(req.params.id);
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  const currentStatus = doc.documentStatus;

  // if already completed or cancelled block any updates
  if (currentStatus === "completed" || currentStatus === "cancelled") {
    return next(
      new AppError(
        `Requests with status "${currentStatus}" cannot be updated anymore.`,
        400
      )
    );
  }

  if (currentStatus === status) {
    return next(new AppError(`Already in ${status} status`, 400));
  }

  // prevent invalid backward transitions
  if (currentStatus === "processing" && status === "pending") {
    return next(
      new AppError("Cannot revert from processing back to pending", 400)
    );
  }

  if (currentStatus === "ready-to-pickup" && status !== "completed") {
    return next(
      new AppError(
        'When a request is "ready-to-pickup" it can only be updated to "completed".',
        400
      )
    );
  }

  // cancel rules
  if (status === "cancelled") {
    if (currentStatus !== "pending" && currentStatus !== "processing") {
      return next(
        new AppError(
          "Only pending or processing requests can be cancelled",
          400
        )
      );
    }
    if (!cancelReason) {
      return next(
        new AppError("Cancel reason is required when canceling", 400)
      );
    }
    doc.cancelReason = cancelReason;
    doc.documentStatus = "cancelled";

    await doc.save();

    return res.status(200).json({
      status: "success",
      data: { doc },
    });
  } else if (cancelReason) {
    return next(
      new AppError(
        "Cancel reason can only be set when canceling a request.",
        400
      )
    );
  }

  doc.documentStatus = status;
  await doc.save();

  res.status(200).json({
    status: "success",
    data: { doc },
  });
});

exports.getAllDocuments = factory.getAll(Document);
