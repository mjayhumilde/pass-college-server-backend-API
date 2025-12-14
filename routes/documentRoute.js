const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const documentController = require("../controller/documentController");

router.use(authController.protect);

router
  .route("/")
  .get(
    authController.restrictTo("admin", "registrar"),
    documentController.getAllDocuments
  )
  .post(
    authController.restrictTo("student"),
    documentController.createDocument
  );

router.get(
  "/my-request",
  authController.restrictTo("student"),
  documentController.getMyDocuments
);

router.get(
  "/clearance/pending",
  authController.restrictTo("teacher"),
  documentController.getPendingClearanceRequests
);

router.delete(
  "/my-request/:id",
  authController.restrictTo("student"),
  documentController.deleteMyDocument
);

router.patch(
  "/:id/status",
  authController.restrictTo("admin", "registrar"),
  documentController.updateDocumentStatus
);

router.use("/:id", documentController.restrictStudentUpdateDelete);

module.exports = router;
