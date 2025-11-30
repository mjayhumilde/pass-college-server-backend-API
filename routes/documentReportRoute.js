const express = require("express");
const router = express.Router();

const authController = require("../controller/authController");
const reportController = require("../controller/documentReportController");

// Protect ALL routes and only allow ADMIN
router.use(authController.protect);
router.use(authController.restrictTo("admin"));

router.get("/summary", reportController.getSummaryReport);
router.get("/types", reportController.getTypeReport);
router.get("/full", reportController.getFullReport);

module.exports = router;
