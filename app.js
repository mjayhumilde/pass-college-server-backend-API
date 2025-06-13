const express = require("express");
const cors = require("cors");

const postRouter = require("./routes/postRoute");

// START EXPRESS APP
const app = express();

// 1) Global Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

// 2) ROUTES
app.use("/api/v1/post", postRouter);
// app.use("/api/v1/request");

module.exports = app; // Export the app instance
