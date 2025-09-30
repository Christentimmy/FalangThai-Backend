import { Request, Response } from "express";
import User from "../models/user_model";

export const userController = {
  updateUserGender: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const { gender } = req.body;

      if (
        !gender ||
        !["male", "female", "others", "prefer_not_to_say"].includes(gender)
      ) {
        res.status(400).json({
          message:
            "Invalid gender. Use 'male', 'female', 'others', or 'prefer_not_to_say'.",
        });
        return;
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { gender },
        { new: true }
      );

      if (!updatedUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({ message: "Gender updated successfully" });
    } catch (error) {
      console.error("Error updating gender:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  updateUserHobbies: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!req.body) {
        res.status(400).json({ message: "Bad Request" });
        return;
      }
      
      const { hobbies } = req.body;

      if (!Array.isArray(hobbies) || hobbies.length === 0) {
        res.status(400).json({
          message: "Hobbies must be a non-empty array",
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { hobbies },
        { new: true, select: "hobbies" }
      );

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        message: "Hobbies updated successfully",
      });
    } catch (error) {
      console.error("Error updating hobbies:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
