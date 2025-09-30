import express from "express";
import { userController } from "../controller/user_controller";
import tokenValidationMiddleware from "../middlewares/token_validator";

const router = express.Router();
router.use(tokenValidationMiddleware);

router.post("/update-gender", userController.updateUserGender);
router.patch("/update-hobbies", userController.updateUserHobbies);

export default router;
