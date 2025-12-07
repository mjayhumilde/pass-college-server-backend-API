const mongoose = require("mongoose");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION💥 Shutting Down...");
  console.log(err.name, err);
  process.exit(1);
});

dotenv.config({ path: "./.env" });
dotenv.config({ path: "./config.env" });

const app = require("./app");

const { DATABASE, DATABASE_PASSWORD, PORT } = process.env;
const DB = DATABASE.replace("<PASSWORD>", DATABASE_PASSWORD);

// Connect to MongoDB
mongoose.connect(DB).then(() => {
  console.log("MongoDB connected successfully!");
});

const port = PORT || 2000;

// Create HTTP server FIRST (required for socket.io)
const server = http.createServer(app);

// Setup socket.io server
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

require("./utils/socket")(io);

// Start Express || Socket.IO
server.listen(port, () => {
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
