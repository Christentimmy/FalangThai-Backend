

import { Request, Response, NextFunction } from "express";
import Subscription from "../models/subscription_model";

// Check if user has active subscription
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: "Unauthorized" 
      });
    }

    const subscription = await Subscription.findOne({
      userId,
      status: "active",
      currentPeriodEnd: { $gt: new Date() },
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: "Active subscription required",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    res.locals.subscription = subscription;
    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify subscription",
    });
  }
};


// Add subscription info to user requests (non-blocking)
export const addSubscriptionInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.userId;
    
    if (userId) {
      const subscription = await Subscription.findOne({
        userId,
        status: { $in: ["active", "past_due"] },
      });
      
      res.locals.subscription = subscription;
    }
    
    next();
  } catch (error) {
    // Don't block the request, just log the error
    console.error("Add subscription info error:", error);
    next();
  }
};

