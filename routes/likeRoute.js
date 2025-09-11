const express = require("express");
const router = express.Router();

const likeController = require("../controller/likeController");
const authController = require("../controller/authController");

router
  .route("/")
  .get(likeController.getAllLikes)
  .post(authController.protect, likeController.createLike);

router
  .route("/:id")
  .get(likeController.getOneLike)
  .delete(authController.protect, likeController.deleteLike);

module.exports = router;
