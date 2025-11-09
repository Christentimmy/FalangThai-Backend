
import express from "express";
import { invitationController } from "../controller/invitation_controller";
import tokenValidationMiddleware from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";

const router = express.Router();

router.use(tokenValidationMiddleware);
router.post("/redeem", invitationController.redeemInviteCode);

router.use(statusChecker);
router.get("/my-code", invitationController.getMyInviteCode);
router.get("/stats", invitationController.getInviteStats);
router.get("/premium-status", invitationController.getPremiumStatus);

export default router;