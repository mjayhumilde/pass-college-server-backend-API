const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");
const authController = require("../controller/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

//Protect all routes after this middleware
router.use(authController.protect);

router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", userController.getMe, userController.getOneUser);
// router.delete('/deleteMe', userController.deleteMe); // not needed here as of now
router.patch(
  "/updateMe",
  // userController.uploadUserPhoto,
  // userController.resizeUserPhoto,   // this are needed if we have a user profile photo
  userController.updateMe
);

//Restrict all routes after this middleware
router.use(authController.restrictTo("teacher", "admin"));

router
  .route("/")
  .get(userController.getAllUser)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getOneUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
