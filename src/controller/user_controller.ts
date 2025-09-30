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

  updateInterestIn: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!req.body) {
        res.status(400).json({ message: "Bad Request" });
        return;
      }

      const { interest_in } = req.body;

      if (
        !["men", "women", "non-binary", "transgender", "everyone"].includes(
          interest_in
        )
      ) {
        res.status(400).json({ message: "Invalid value for interest_in." });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { interested_in: interest_in, profile_completed: true } },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({ message: "Interest updated successfully" });
    } catch (error) {
      console.error("Error updating interest_in:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  saveUserOneSignalId: async (req: Request, res: Response) => {
    try {
      const oneSignalId = req.params.id;
      if (!oneSignalId) {
        res.status(400).json({ message: "One Signal ID is required" });
        return;
      }
      const userId = res.locals.userId;

      if (!userId) {
        res.status(400).json({ message: "user id required" });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      user.one_signal_id = oneSignalId;
      await user.save();

      res.status(200).json({ message: "User One Signal Saved Successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  getUserDetails: async (req: Request, res: Response) => {
    try {
      const user = await User.findById(res.locals.userId);
      if (!user) {
        res.status(404).json({ message: "user not found" });
        return;
      }
      const customUser = user.toObject();
      delete customUser.password;
      delete customUser.role;
      delete customUser.__v;

      res.status(200).json({
        message: "user retrieved successfully",
        data: customUser,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateUserLocation: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Bad Request" });
        return;
      }
      const { longitude, latitude, address } = req.body;

      const userId = res.locals.userId;

      // Validate input
      if (
        !longitude ||
        !latitude ||
        !address ||
        !userId ||
        isNaN(longitude) ||
        isNaN(latitude)
      ) {
        res.status(400).json({
          error: " {lat,lng,address required} or Invalid longitude or latitude",
        });
        return;
      }

      // Find and update driver location
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            location: {
              type: "Point",
              address: address.split(" ")[0],
              coordinates: [longitude, latitude],
            },
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        res.status(404).json({ error: "user not found" });
        return;
      }

      res.json({
        message: "Location updated successfully",
        data: { location: updatedUser.location },
      });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};
