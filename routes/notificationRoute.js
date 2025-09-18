const express = require("express");
const notificationController = require("../controller/notificationController");
const authController = require("../controller/authController");
const router = express.Router();

router.use(authController.protect);
router.get("/me", notificationController.getMyNotifications);
router.patch("/mark-all-read", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);
router.delete("/", notificationController.deleteAllMyNotifications);

module.exports = router;
