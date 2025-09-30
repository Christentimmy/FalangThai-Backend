import express from "express";
import { userController } from "../controller/user_controller";
import tokenValidationMiddleware from "../middlewares/token_validator";
import { statusChecker } from "../models/status_middleware";

const router = express.Router();
router.use(tokenValidationMiddleware);

router.get("/get-user-details", userController.getUserDetails);
router.post("/update-gender", userController.updateUserGender);
router.patch("/update-hobbies", userController.updateUserHobbies);
router.patch("/update-interest-in", userController.updateInterestIn);
router.patch("/update-one-signal-id/:id", userController.saveUserOneSignalId);
router.patch("/update-location", userController.updateUserLocation);

router.use(statusChecker);
router.get("/get-potential-matches", userController.getPotentialMatches);
router.post("/swipe-user", userController.swipeUser);

export default router;
