const express = require("express");
const router = express.Router();
const likeController = require("../controller/likeController");
const authController = require("../controller/authController");

// Protect all routes after this
router.use(authController.protect);

router
  .route("/")
  .get(likeController.getAllLikes)
  .post(likeController.createLike);

router
  .route("/:id")
  .get(likeController.getOneLike)
  .delete(likeController.deleteLike);

module.exports = router;
