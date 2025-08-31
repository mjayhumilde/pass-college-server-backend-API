const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const globalErrorHandler = require("./controller/errorController");
const AppError = require("./utils/appError");
const postRouter = require("./routes/postRoute");
const documentRouter = require("./routes/documentRoute");
const userRouter = require("./routes/userRoute");

// START EXPRESS APP
const app = express();

// 1) Global Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

app.use(cookieParser());

//DEVELOPMENT  logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 2) ROUTES
app.use("/api/v1/post", postRouter);
app.use("/api/v1/document", documentRouter);
app.use("/api/v1/user", userRouter);

app.use(globalErrorHandler);

module.exports = app; // Export the app instance
