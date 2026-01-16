import { Request, Response, NextFunction } from "express";
import User from "../models/user_model";

export const checkSwipeLimit = async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.userId;
    const user = await User.findById(userId);

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    if (user.subscription.status === "active") {
        next();
        return;
    }

    if (user.daily_swipes >= 10) {
        res.status(403).json({ message: "Swipe limit reached for today." });
        return;
    }

    user.daily_swipes += 1;
    await user.save();
    next();
};
