const Document = require("../model/documentModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { getDateRange } = require("../utils/timerange");

const defaultDocumentBreakdown = {
  goodMoral: 0,
  idCard: 0,
  grades: 0,
  diploma: 0,
  transcriptOfRecords: 0,
};

exports.getSummaryReport = catchAsync(async (req, res, next) => {
  const { range } = req.query;

  if (!range) return next(new AppError("Timeframe (range) is required", 400));

  const { start, end } = getDateRange(range);

  const docs = await Document.find({
    createdAt: { $gte: start, $lte: end },
  });

  // status summary
  const statusBreakdown = {
    pending: docs.filter((d) => d.documentStatus === "pending").length,
    processing: docs.filter((d) => d.documentStatus === "processing").length,
    readyToPickup: docs.filter((d) => d.documentStatus === "ready-to-pickup")
      .length,
    completed: docs.filter((d) => d.documentStatus === "completed").length,
    cancelled: docs.filter((d) => d.documentStatus === "cancelled").length,
  };

  // document type summary
  let documentBreakdown = { ...defaultDocumentBreakdown };

  docs.forEach((doc) => {
    if (documentBreakdown[doc.documentType] !== undefined) {
      documentBreakdown[doc.documentType]++;
    }
  });

  res.status(200).json({
    status: "success",
    data: {
      timeframe: range,
      totalRequests: docs.length,
      statusBreakdown,
      documentBreakdown,
    },
  });
});
exports.getTypeReport = catchAsync(async (req, res, next) => {
  const { range } = req.query;

  if (!range) return next(new AppError("Timeframe (range) is required", 400));

  const { start, end } = getDateRange(range);

  const types = await Document.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$documentType",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    timeframe: range,
    data: types,
  });
});

exports.getFullReport = catchAsync(async (req, res, next) => {
  const { range } = req.query;

  if (!range) return next(new AppError("Timeframe (range) is required", 400));

  const { start, end } = getDateRange(range);

  const docs = await Document.find({
    createdAt: { $gte: start, $lte: end },
  });

  const summary = {
    timeframe: range,
    totalRequests: docs.length,
    statusBreakdown: {
      pending: docs.filter((d) => d.documentStatus === "pending").length,
      processing: docs.filter((d) => d.documentStatus === "processing").length,
      readyToPickup: docs.filter((d) => d.documentStatus === "ready-to-pickup")
        .length,
      completed: docs.filter((d) => d.documentStatus === "completed").length,
      cancelled: docs.filter((d) => d.documentStatus === "cancelled").length,
    },
  };

  const types = await Document.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: "$documentType",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    summary,
    documentTypes: types,
  });
});
