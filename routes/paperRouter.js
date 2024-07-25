const express = require("express");
const paperController = require("../controllers/paperController.js");
const authController = require("../controllers/authController.js");

const router = express.Router();

router.post(
  "/",
  authController.protect,
  paperController.uploadPaper,
  paperController.savePaper
);
router.get("/:id", paperController.getPaperById);

module.exports = router;
