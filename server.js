const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION💥 Shutting Down...");
  console.log(err.name, err.message);

  process.exit(1);
});

dotenv.config({ path: "./config.env" });
const app = require("./app"); // Import the Express app from app.js

const { DATABASE, DATABASE_PASSWORD, PORT } = process.env;
const DB = DATABASE.replace("<PASSWORD>", DATABASE_PASSWORD);

// Connect to MongoDB
mongoose.connect(DB).then(() => {
  console.log("MongoDB connected successfull!");
});
const port = PORT || 2000;
const server = app.listen(port, () => {
  console.log(`App running on Port ${port}...`);
});

// safety net rejection || last error catcher
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION!💥 Shutting Down...");
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});
