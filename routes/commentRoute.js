const express = require("express");
const router = express.Router();
const commentController = require("../controller/commentController");
const authController = require("../controller/authController");

// Protect all routes after this
router.use(authController.protect);

router
  .route("/")
  .get(commentController.filterCommentsByPost, commentController.getAllComments)
  .post(commentController.createComment);

router
  .route("/:id")
  .get(commentController.getOneComment)
  .patch(commentController.updateComment)
  .delete(commentController.deleteComment);

module.exports = router;
