const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup, authController.login);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:rT", authController.resetPassword);
router.get("/user/:userid", userController.getUserwithUserID);
router.get("/email/:email", userController.getUserwithEmail);

//

router.use(authController.protect);

router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.authorizeDriveToken,
  userController.updateMe
);
router.delete("/deleteMe", authController.protect, userController.deleteMe);
router.route("/").get(userController.getUsers);
//

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
