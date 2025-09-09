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

const path = require("path");
app.use("/img", express.static(path.join(__dirname, "public", "img")));

app.use(cookieParser());

//DEVELOPMENT  logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// 2) ROUTES
app.use("/api/v1/post", postRouter);
app.use("/api/v1/document", documentRouter);
app.use("/api/v1/user", userRouter);

// default route
app.get("/", (req, res) => {
  res.send("Welcome to the Pass College Server API!");
});

// catcht all undefined routes || i using .use instead of .all because its crashing
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app; // Export the app instance
