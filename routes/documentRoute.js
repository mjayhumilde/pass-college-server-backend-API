const express = require("express");
const router = express.Router();

const documentController = require("../controller/documentController");

router
  .route("/")
  .get(documentController.getAllDocuments)
  .post(documentController.createDocument);

router
  .route("/:id")
  .get(documentController.getOneDocument)
  .patch(documentController.updateDocument)
  .delete(documentController.deleteDocument);

module.exports = router;
