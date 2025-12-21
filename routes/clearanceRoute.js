const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const clearanceController = require("../controller/clearanceController");

router.use(authController.protect);

router.post(
  "/:documentId",
  authController.restrictTo("teacher"),
  clearanceController.scheduleClearance
);

router.get(
  "/my-meeting",
  authController.restrictTo("student"),
  clearanceController.getMyClearanceMeeting
);

router.patch(
  "/:documentId/reschedule",
  authController.restrictTo("teacher"),
  clearanceController.rescheduleClearance
);

router.patch(
  "/:documentId/complete",
  authController.restrictTo("teacher"),
  clearanceController.completeClearance
);

module.exports = router;
