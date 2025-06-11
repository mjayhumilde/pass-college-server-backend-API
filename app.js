const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

// Simple test route
app.get("/", (req, res) => {
  res.send("API is running!");
});

module.exports = app; // Export the app instance
