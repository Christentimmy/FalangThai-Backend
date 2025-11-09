import { Router } from "express";
import { adminWalletController } from "../controller/admin_wallet_controller";
import tokenValidationMiddleware from "../middlewares/token_validator";
import { adminStatusChecker } from "../middlewares/status_middleware";
import { requireAdmin } from "../middlewares/admin_middleware";

const router = Router();

// All routes require authentication and admin role
router.use(tokenValidationMiddleware);
router.use(adminStatusChecker);
router.use(requireAdmin);

router.get("/withdrawals", adminWalletController.getAllWithdrawals);
router.post("/withdrawals/:id/approve", adminWalletController.approveWithdrawal);
router.post("/withdrawals/:id/reject", adminWalletController.rejectWithdrawal);
router.get("/commissions/stats", adminWalletController.getCommissionStats);

export default router;
