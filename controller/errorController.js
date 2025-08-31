const AppError = require("../utils/appError");

// Handle invalid MongoDB ObjectId errors
const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

// Handle duplicate key errors (e.g. unique email/username)
const handleDuplicateFieldDB = (error) => {
  if (!error.keyValue) {
    return new AppError("Duplicate field error, but keyValue is missing.", 400);
  }

  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `Duplicate field value: "${value}". Please use another value!`;
  return new AppError(message, 400);
};

// Handle validation errors from Mongoose schema
const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handle JWT errors
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

// Send detailed errors in development
const sendErrorDev = (error, req, res) => {
  return res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    error,
    name: error.name,
    code: error.code,
    stack: error.stack,
  });
};

// Send clean errors in production
const sendErrorProd = (error, req, res) => {
  // Trusted / operational error: send safe message
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }

  // Programming or unknown error: don’t leak details
  console.error("ERROR 💥", error);
  return res.status(500).json({
    status: "error",
    message: "Something went very wrong!",
  });
};

module.exports = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, req, res);
  } else if (process.env.NODE_ENV === "production") {
    // Keep prototype chain intact
    let err = Object.create(error);
    err.message = error.message;

    // Handle specific errors
    if (err.name === "CastError") err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateFieldDB(err);
    if (err.name === "ValidationError") err = handleValidationErrorDB(err);
    if (err.name === "JsonWebTokenError") err = handleJWTError();
    if (err.name === "TokenExpiredError") err = handleJWTExpiredError();

    // Fallback for unexpected Mongo errors
    if (err.name === "MongoServerError" && !err.isOperational) {
      err = new AppError("Database error occurred", 500);
    }

    sendErrorProd(err, req, res);
  }
};
