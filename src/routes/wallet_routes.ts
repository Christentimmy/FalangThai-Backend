import { Router } from "express";
import { walletController } from "../controller/wallet_controller";
import tokenValidationMiddleware from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";

const router = Router();

router.use(tokenValidationMiddleware);
router.use(statusChecker);

router.get("/history", walletController.getWallet);
router.get("/commissions", walletController.getCommissions);
router.put("/payment-info", walletController.updatePaymentInfo);
router.post("/withdraw", walletController.requestWithdrawal);
router.get("/withdrawals", walletController.getWithdrawals);
router.delete("/withdrawals/:id", walletController.cancelWithdrawal);

export default router;
