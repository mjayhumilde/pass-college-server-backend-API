const express = require("express");
const router = express.Router();
const subscriberController = require("../controller/subscriberController");
const authController = require("../controller/authController");

//  PUBLIC ROUTES
router.post("/subscribe", subscriberController.addSubscriber);
router.patch("/unsubscribe/:token", subscriberController.unsubscribe);

// PROTECTED ROUTES
router.use(authController.protect);
router.use(authController.restrictTo("admin", "registrar"));

router.get("/", subscriberController.getAllSubscribers);
router.post("/", subscriberController.addSubscriber);
router.delete("/:id", subscriberController.deleteSubscriber);

// Send newsletter to all active subscribers
router.post("/send-newsletter", subscriberController.sendNewsletter);

module.exports = router;
