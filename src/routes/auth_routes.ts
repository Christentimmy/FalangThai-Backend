import express from "express";
import { authController } from "../controller/auth_controller";
import { uploadProfile } from "../middlewares/upload";
import tokenValidationMiddleware from "../middlewares/token_validator";

const router = express.Router();

router.post("/validate-token", authController.validateToken);
router.post("/login", authController.login);
router.post("/register", authController.signUpUser);
router.post("/verify-otp", authController.verifyOTP);
router.post("/send-otp", authController.sendOTp);
router.post("/google-auth-signup", authController.googleAuthSignUp);
router.post("/google-auth-signin", authController.googleAuthSignIn);
router.post("/reset-password", authController.resetPassword);

router.use(tokenValidationMiddleware);
router.post("/logout", authController.logoutUser);
router.post("/complete-profile", uploadProfile.single("avatar"), authController.completeProfile);
router.post("/change-auth-details", authController.changeEmailOrNumber);
router.post("/change-password", authController.changePassword);

export default router;
