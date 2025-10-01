
import express from "express";
import { subscriptionController } from "../controller/subscription_controller";
import tokenValidationMiddleware from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";
import { addSubscriptionInfo, requireActiveSubscription } from "../middlewares/subscription_middleware";

const router = express.Router();

// Public routes
router.get("/plans", subscriptionController.getPlans);

router.get("/success", subscriptionController.success);
router.get("/canceled", subscriptionController.cancelled);

router.use(tokenValidationMiddleware, statusChecker, addSubscriptionInfo);
router.post("/create", subscriptionController.createSubscription);

router.use(requireActiveSubscription);
router.get("/current", subscriptionController.getCurrentSubscription);
router.post("/cancel", subscriptionController.cancelUserSubscription);
router.post("/reactivate", subscriptionController.reactivateUserSubscription);
// router.post("/portal", subscriptionController.getPortalSession);

export default router;
