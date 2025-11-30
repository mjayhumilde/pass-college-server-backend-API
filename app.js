const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const globalErrorHandler = require("./controller/errorController");
const AppError = require("./utils/appError");
const postRouter = require("./routes/postRoute");
const documentRouter = require("./routes/documentRoute");
const userRouter = require("./routes/userRoute");
const commentRouter = require("./routes/commentRoute");
const likeRouter = require("./routes/likeRoute");
const notificatonRouter = require("./routes/notificationRoute");
const accountRequestRouter = require("./routes/accountRequestRoute");
const knowledgeRouter = require("./routes/knowledgeRoute");
const documentReportRouter = require("./routes/documentReportRoute");

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
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/notification", notificatonRouter);
app.use("/api/v1/account-request", accountRequestRouter);
app.use("/api/v1/knowledge", knowledgeRouter);
app.use("/api/v1/document-report", documentReportRouter);

// default route
app.get("/", (req, res) => {
  res.send("Welcome to the Pass College Server API!");
});

app.get("/favicon.ico", (req, res) => res.status(204).end());

// catcht all undefined routes || i using .use instead of .all because its crashing
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app; // Export the app instance
