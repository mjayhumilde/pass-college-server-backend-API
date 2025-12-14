const AvailableDocument = require("../model/availableDocumentModel");
const User = require("../model/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Registrar/Admin: create available document
exports.createAvailableDocument = catchAsync(async (req, res, next) => {
  const { name, requiresClearance, assignedTeacher } = req.body;

  //role validation for clearance
  if (requiresClearance) {
    if (!assignedTeacher) {
      return next(new AppError("Assigned teacher is required", 400));
    }

    const teacher = await User.findById(assignedTeacher);
    if (!teacher || teacher.role !== "teacher") {
      return next(new AppError("Assigned user must be a teacher", 400));
    }
  }

  const doc = await AvailableDocument.create({
    name,
    requiresClearance,
    assignedTeacher,
  });

  res.status(201).json({
    status: "success",
    data: { doc },
  });
});

// Public / Student: get active documents
exports.getAvailableDocuments = catchAsync(async (req, res, next) => {
  const docs = await AvailableDocument.find({ active: true }).sort("name");

  res.status(200).json({
    status: "success",
    results: docs.length,
    data: { docs },
  });
});

// Registrar/Admin: delete (soft delete recommended)
exports.deleteAvailableDocument = catchAsync(async (req, res, next) => {
  const doc = await AvailableDocument.findById(req.params.id);

  if (!doc) {
    return next(new AppError("No available document found with that ID", 404));
  }

  doc.active = false;
  await doc.save();

  res.status(204).json({
    status: "success",
    data: null,
  });
});
