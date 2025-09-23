const express = require("express");
const accountRequestController = require("../controller/accountRequestController");
const authController = require("../controller/authController");

const router = express.Router();

router.post(
  "/",
  accountRequestController.uploadRegistrationForm,
  accountRequestController.uploadToCloudinary,
  accountRequestController.createAccountRequest
);

router.post("/check-status", accountRequestController.checkRequestStatus);

router.use(
  authController.protect,
  authController.restrictTo("registrar", "admin")
);

router.get("/", accountRequestController.getPendingRequests);
router.patch("/:id/approve", accountRequestController.approveRequest);
router.patch("/:id/reject", accountRequestController.rejectRequest);
router.patch(
  "/:id/update-status",
  accountRequestController.overrideRejectedRequest
);

module.exports = router;
