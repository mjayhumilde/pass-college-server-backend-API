const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const availableDocController = require("../controller/availableDocementController");

router.use(authController.protect);

router
  .route("/")
  .get(availableDocController.getAvailableDocuments)
  .post(
    authController.restrictTo("admin", "registrar"),
    availableDocController.createAvailableDocument
  );

router.delete(
  "/:id",
  authController.restrictTo("admin", "registrar"),
  availableDocController.deleteAvailableDocument
);

module.exports = router;
