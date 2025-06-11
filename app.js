const express = require("express");
const cors = require("cors");

// START EXPRESS APP
const app = express();

// 1) Global Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

// 2) ROUTES
app.get("/api/v1/post", (req, res) => {
  res.send("Get All Post Types");
});
app.get("/api/v1/request", (req, res) => {
  res.send("Get All Request Documents");
});

module.exports = app; // Export the app instance
