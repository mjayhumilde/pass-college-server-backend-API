const express = require("express");
const router = express.Router();

const postController = require("../controller/postController");

router
  .route("/")
  .get(postController.getAllPost)
  .post(postController.createPost);
router
  .route("/:id")
  .get(postController.getPost)
  .patch(postController.updatePost)
  .delete(postController.deletePost);

// router.route("/:postType").get(postController);

// Read
// router.route("/annoucement").get(postController);
// router.route("/news").get(postController);
// router.route("/events").get(postController);
// router.route("/uniforms-update").get(postController);
// router.route("/careers").get(postController);

// Update
// router.route("/annoucement:id").patch(postController);
// router.route("/news:id").patch(postController);
// router.route("/events:id").patch(postController);
// router.route("/uniforms-update:id").patch(postController);
// router.route("/careers:id").patch(postController);

// Delete
// router.route("/annoucement:id").delete(postController);
// router.route("/news:id").delete(postController);
// router.route("/events:id").delete(postController);
// router.route("/uniforms-update:id").delete(postController);
// router.route("/careers:id").delete(postController);

module.exports = router;
