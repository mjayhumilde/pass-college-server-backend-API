const express = require("express");
const authController = require("../controller/authController");
const knowledgeController = require("../controller/knowlegeController");

const router = express.Router();

router.post("/chat", knowledgeController.chat);

router.use(authController.protect);
router.use(authController.restrictTo("admin", "registrar"));

router
  .route("/")
  .get(knowledgeController.getAllKnowledge)
  .post(knowledgeController.createKnowledge);

router
  .route("/:id")
  .patch(knowledgeController.updateKnowledge)
  .delete(knowledgeController.deleteKnowledge);

module.exports = router;
