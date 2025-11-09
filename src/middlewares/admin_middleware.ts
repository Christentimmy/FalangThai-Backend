import { Request, Response, NextFunction } from "express";
import { IUser } from "../types/user_type";

/**
 * Middleware to check if user has admin role
 * Must be used after tokenValidationMiddleware and statusChecker/adminStatusChecker
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user: IUser = res.locals.user || res.locals.admin;
    
    if (!user) {
      res.status(401).json({ message: "Unauthorized access" });
      return;
    }

    // Check if user has admin role
    if (!["super_admin", "sub_admin"].includes(user.role)) {
      res.status(403).json({ 
        message: "Access denied. Admin privileges required." 
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin check failed:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
