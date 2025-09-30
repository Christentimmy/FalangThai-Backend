import express from "express";
import { authController } from "../controller/auth_controller";
import { uploadProfile } from "../middlewares/upload";
import tokenValidationMiddleware from "../middlewares/token_validator";

const router = express.Router();

router.post("/register", authController.signUpUser);
router.post("/verify-otp", authController.verifyOTP);
router.post("/send-otp", authController.sendOTp);

router.use(tokenValidationMiddleware);
router.post("/complete-profile", uploadProfile.single("avatar"), authController.completeProfile);

export default router;
