const ClearanceMeeting = require("../model/clearanceMeetingModel");
const Document = require("../model/documentModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.scheduleClearance = catchAsync(async (req, res, next) => {
  const { room, meetingDate, description } = req.body;
  const { documentId } = req.params;

  const doc = await Document.findById(documentId);

  if (!doc) {
    return next(new AppError("Document request not found", 404));
  }

  if (!doc.requiresClearance) {
    return next(new AppError("This document does not require clearance", 400));
  }

  if (doc.clearanceStatus !== "awaiting") {
    return next(new AppError("Clearance already scheduled or completed", 400));
  }
  if (doc.assignedTeacher.toString() !== req.user.id) {
    return next(
      new AppError("You are not assigned to handle this clearance", 403)
    );
  }

  const meeting = await ClearanceMeeting.create({
    document: doc._id,
    teacher: req.user.id,
    student: doc.requestedBy,
    room,
    meetingDate,
    description,
  });

  doc.clearanceStatus = "scheduled";
  await doc.save();

  // try {
  //   await new Email(doc.requestedBy).sendClearanceScheduled(
  //     doc.documentType,
  //     meeting
  //   );
  // } catch (err) {
  //   console.error("❌ Clearance email failed:", err);
  // }

  res.status(201).json({
    status: "success",
    data: { meeting },
  });
});

exports.getMyClearanceMeeting = catchAsync(async (req, res, next) => {
  const meeting = await ClearanceMeeting.findOne({
    student: req.user.id,
  })
    .populate("teacher", "firstName lastName email")
    .populate("document", "documentType");

  if (!meeting) {
    return next(new AppError("No clearance meeting scheduled yet", 404));
  }

  res.status(200).json({
    status: "success",
    data: { meeting },
  });
});

exports.rescheduleClearance = catchAsync(async (req, res, next) => {
  const { room, meetingDate, description } = req.body;
  const { documentId } = req.params;

  const doc = await Document.findById(documentId);

  if (!doc) {
    return next(new AppError("Document request not found", 404));
  }

  if (!doc.requiresClearance) {
    return next(new AppError("This document does not require clearance", 400));
  }

  if (doc.clearanceStatus !== "scheduled") {
    return next(
      new AppError(
        "Clearance can only be rescheduled if it is already scheduled",
        400
      )
    );
  }

  if (doc.assignedTeacher.toString() !== req.user.id) {
    return next(
      new AppError("You are not assigned to handle this clearance", 403)
    );
  }

  const meeting = await ClearanceMeeting.findOne({
    document: documentId,
  });

  if (!meeting) {
    return next(new AppError("No clearance meeting found to reschedule", 404));
  }

  // Update only allowed fields
  meeting.room = room ?? meeting.room;
  meeting.meetingDate = meetingDate ?? meeting.meetingDate;
  meeting.description = description ?? meeting.description;

  await meeting.save();

  res.status(200).json({
    status: "success",
    data: { meeting },
  });
});
