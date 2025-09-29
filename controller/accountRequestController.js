const multer = require("multer");
const AppError = require("../utils/appError");
const cloudinary = require("../utils/cloudinary");

const AccountRequest = require("../model/accountRequestModel");
const User = require("../model/userModel");
const catchAsync = require("../utils/catchAsync");
const Email = require("../utils/Email");

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new AppError("Only images allowed!", 400), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

exports.uploadRegistrationForm = upload.fields([
  { name: "front", maxCount: 1 },
  { name: "back", maxCount: 1 },
]);

exports.uploadToCloudinary = async (req, res, next) => {
  if (!req.files || !req.files.front || !req.files.back) {
    return next(new AppError("Both front and back images are required", 400));
  }

  const uploadImage = (file) =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "account-requests", format: "jpeg" },
        (err, result) => (err ? reject(err) : resolve(result.secure_url))
      );
      stream.end(file.buffer);
    });

  req.body.registrationFormImages = {
    front: await uploadImage(req.files.front[0]),
    back: await uploadImage(req.files.back[0]),
  };

  next();
};

exports.createAccountRequest = catchAsync(async (req, res, next) => {
  const { firstName, lastName, course, email, role } = req.body;

  //Check if email is a deactivated account
  const existingUser = await User.findOneWithInactive({ email }).select(
    "+active"
  );
  if (existingUser && existingUser.active === false) {
    return next(
      new AppError(
        "This email belongs to a deactivated account. Please go to the Registrar Office for explanation/reason to reactivate your account.",
        400
      )
    );
  }

  //  Check if there's already a request for this email
  const existingRequest = await AccountRequest.findOne({ email });
  if (existingRequest) {
    let message = "An account request with this email already exists.";
    if (existingRequest.status === "pending") {
      message = "Your request is still under review.";
    } else if (existingRequest.status === "approved") {
      message =
        "Your request has already been approved. Please check your email.";
    } else if (existingRequest.status === "rejected") {
      message =
        "Your request was rejected. Please go to the registrar office in person for clarification.";
    }

    return next(new AppError(message, 400));
  }

  const finalCourse = role === "student" ? course : "none";

  const request = await AccountRequest.create({
    firstName,
    lastName,
    course: finalCourse,
    email,
    role: role || "student",
    registrationFormImages: req.body.registrationFormImages,
  });

  res.status(201).json({
    status: "success",
    data: { request },
  });
});

exports.getAllRequests = catchAsync(async (req, res, next) => {
  const queryObj = { ...req.query };

  let query = AccountRequest.find(queryObj).populate(
    "reviewedBy",
    "firstName lastName email role"
  );

  const requests = await query;

  res.status(200).json({
    status: "success",
    results: requests.length,
    data: { requests },
  });
});

exports.approveRequest = catchAsync(async (req, res, next) => {
  const request = await AccountRequest.findById(req.params.id);
  if (!request) return next(new AppError("Request not found", 404));

  if (request.status === "approved") {
    return next(new AppError("Request already approved", 400));
  }

  //  Make sure no duplicate user is created
  const existingUser = await User.findOne({ email: request.email });
  if (existingUser) {
    return next(new AppError("User already exists with this email", 400));
  }

  const defaultPassword = "test1234"; // or random generator

  const user = await User.create({
    firstName: request.firstName,
    lastName: request.lastName,
    email: request.email,
    course: request.role === "student" ? request.course : "none",
    password: defaultPassword,
    passwordConfirm: defaultPassword,
    role: request.role || "student",
  });

  request.status = "approved";
  request.reviewedBy = req.user.id;
  await request.save();

  const url = "https://pass-college.netlify.app/";
  await new Email(user, url).sendWelcome(user.email, defaultPassword);

  res.status(200).json({
    status: "success",
    message: "Account approved and user created",
    data: { user },
  });
});

exports.rejectRequest = catchAsync(async (req, res, next) => {
  const request = await AccountRequest.findById(req.params.id);
  if (!request) return next(new AppError("Request not found", 404));

  request.status = "rejected";
  request.reviewedBy = req.user.id;
  request.rejectionReason = req.body.reason || "Not specified";
  await request.save();

  res.status(200).json({ status: "success", message: "Request rejected" });
});

exports.checkRequestStatus = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new AppError("Email is required", 400));

  // Check if email belongs to a deactivated account
  const existingUser = await User.findOneWithInactive({ email }).select(
    "+active"
  );
  if (existingUser && existingUser.active === false) {
    return next(
      new AppError(
        "This email belongs to a deactivated account. Please go to the Registrar Office for explanation/reason to reactivate your account.",
        400
      )
    );
  }

  const request = await AccountRequest.findOne({ email }).select(
    "status rejectionReason createdAt updatedAt"
  );

  if (!request) {
    return res.status(200).json({
      status: "success",
      message: "No request found for this email",
      data: null,
    });
  }

  let message;
  if (request.status === "pending") {
    message = "Your request is still under review.";
  } else if (request.status === "approved") {
    message = "Your request has been approved. Please check your email.";
  } else if (request.status === "rejected") {
    message = `Your request was rejected. Reason: ${request.rejectionReason}`;
  }

  res.status(200).json({
    status: "success",
    message,
    data: request,
  });
});

exports.overrideRejectedRequest = catchAsync(async (req, res, next) => {
  const request = await AccountRequest.findById(req.params.id);
  if (!request) return next(new AppError("Request not found", 404));

  if (request.status !== "rejected") {
    return next(new AppError("Only rejected requests can be overridden", 400));
  }

  //  Prevent double user creation
  const existingUser = await User.findOne({ email: request.email });
  if (existingUser) {
    return next(new AppError("User already exists with this email", 400));
  }

  // Generate default
  const defaultPassword = "test1234";

  const user = await User.create({
    firstName: request.firstName,
    lastName: request.lastName,
    email: request.email,
    course: request.role === "student" ? request.course : "none",
    password: defaultPassword,
    passwordConfirm: defaultPassword,
    role: "student",
  });

  request.status = "approved";
  request.reviewedBy = req.user.id;
  request.rejectionReason = undefined;
  await request.save();

  const url = "https://pass-college.netlify.app/";
  await new Email(user, url).sendWelcome(user.email, defaultPassword);

  res.status(200).json({
    status: "success",
    message: "Rejected request overridden and user created",
    data: { user },
  });
});
