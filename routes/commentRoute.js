const express = require("express");
const router = express.Router();
const commentController = require("../controller/commentController");
const authController = require("../controller/authController");

router
  .route("/")
  .get(commentController.filterCommentsByPost, commentController.getAllComments)
  .post(authController.protect, commentController.createComment);

router
  .route("/:id")
  .get(commentController.getOneComment)
  .patch(authController.protect, commentController.updateComment)
  .delete(authController.protect, commentController.deleteComment);

module.exports = router;
