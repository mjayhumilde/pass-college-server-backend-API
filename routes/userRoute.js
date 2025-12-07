const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");
const authController = require("../controller/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.use(authController.protect);

router.get("/search", userController.searchUsers);

router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", userController.getMe, userController.getOneUser);

router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

// Restrict all routes after this middleware
router.use(authController.restrictTo("registrar", "admin"));

router
  .route("/")
  .get(userController.getAllUser)
  .post(userController.createUser);

router.get("/deactivated", userController.getAllDeactivatedUsers);

router
  .route("/:id")
  .get(userController.getOneUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// Soft deactivate / reactivate
router.patch("/:id/deactivate", userController.deactivateUser);
router.patch("/:id/reactivate", userController.reactivateUser);

module.exports = router;
