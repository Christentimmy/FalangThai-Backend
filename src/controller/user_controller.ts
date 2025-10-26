import { Request, Response } from "express";
import User from "../models/user_model";
import { IUser } from "../types/user_type";
import { Swipe } from "../models/swipe_model";
import { Match } from "../models/match_model";
import { sendPushNotification, NotificationType } from "../config/onesignal";
import Notification from "../models/notification_model";
import { Block } from "../models/block_model";

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

  getPotentialMatches: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;

      const [minAge, maxAge] = user.preferences.ageRange ?? [18, 150];
      const maxDistance = user.preferences.maxDistance ?? 50.0;

      // Pagination variables
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = 20;
      const skip = (page - 1) * limit;

      // Calculate min & max birth years for age range filtering
      const currentYear = new Date().getFullYear();
      const minBirthYear = new Date(currentYear - maxAge, 0, 1);
      const maxBirthYear = new Date(currentYear - minAge, 11, 31);

      const aggregatePipeline: any[] = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: user.location.coordinates },
            distanceField: "distance",
            maxDistance: maxDistance * 1000, // Convert km to meters
            spherical: true,
          },
        },
        {
          $lookup: {
            from: "swipes", // collection name in MongoDB
            let: { candidateId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$targetUserId", "$$candidateId"] },
                      { $eq: ["$userId", user._id] }, // only swipes by current user
                    ],
                  },
                },
              },
            ],
            as: "swipeInfo",
          },
        },
        {
          $match: {
            date_of_birth: { $gte: minBirthYear, $lte: maxBirthYear },
            status: "active",
            role: "user",
            hobbies: { $in: user.hobbies },
            isDeleted: false,
            profile_completed: true,
            _id: { $ne: user._id },
            swipeInfo: { $eq: [] },
            ...(user.interested_in !== "everyone" && {
              gender: user.interested_in,
            }),
            $or: [
              { interested_in: "everyone" },
              { interested_in: user.gender },
            ],
          },
        },
        { $sort: { matchPercentage: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            full_name: 1,
            avatar: 1,
            date_of_birth: 1,
            location: 1,
            hobbies: 1,
            distance: 1,
            matchPercentage: 1,
            weekend_availability: 1,
            relationship_preference: 1,
            plan: 1,
            bio: 1,
            isVerified: 1,
          },
        },
      ];

      // Fetch matches using the aggregate pipeline
      const matches = await User.aggregate(aggregatePipeline);

      // Directly use stored location address
      for (let match of matches) {
        const distanceKm = (match.distance / 1000).toFixed(1);
        match.location = {
          address: `${match.location.address} (${distanceKm} Km)`,
          coordinates: match.location.coordinates,
        };
      }

      // Get total count for pagination - This needs to use the same pipeline
      const countPipeline = [...aggregatePipeline];
      countPipeline.splice(-2, 2);
      countPipeline.push({ $count: "total" });
      const countResult = await User.aggregate(countPipeline);
      const totalMatches = countResult.length > 0 ? countResult[0].total : 0;

      res.status(200).json({
        message: "Matches retrieved successfully",
        data: matches,
        page,
        limit,
        totalMatches,
        totalPages: Math.ceil(totalMatches / limit),
        hasNextPage: page * limit < totalMatches,
      });
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  swipeUser: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { targetUserId, type } = req.body;

      if (!targetUserId || !type) {
        res.status(400).json({ message: "Missing required fields" });
        return;
      }
      if (type !== "like" && type !== "pass" && type !== "superlike") {
        res.status(400).json({ message: "Invalid swipe type" });
        return;
      }

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // 3. Prevent duplicate swipe (update if exists)
      await Swipe.findOneAndUpdate(
        { userId, targetUserId },
        { type },
        { new: true, upsert: true }
      );

      if (type === "like" || type === "superlike") {
        const reverseSwipe = await Swipe.findOne({
          userId: targetUserId,
          targetUserId: userId,
          type: { $in: ["like", "superlike"] },
        });

        if (reverseSwipe) {
          const sortedUsers = [userId, targetUserId].sort();
          await Match.create({ users: sortedUsers });
          await sendPushNotification(
            targetUserId,
            targetUser.one_signal_id,
            NotificationType.MATCH,
            "It's a match! 🎉"
          );

          return res.status(200).json({
            message: "It's a match! 🎉",
            match: { userId, targetUserId },
          });
        }
      }

      res.status(200).json({ message: "User liked successfully!" });
    } catch (error) {
      console.error("Error liking user:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  getUserStatus: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      const user = await User.findById(userId).select(
        "status profile_completed location gender interested_in relationship_preference hobbies"
      );

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        message: "User status retrieved",
        data: user,
      });
    } catch (error) {
      console.error("Error retrieving user status:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  updatePreferences: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      let { ageRange, maxDistance, interested_in } = req.body;
      maxDistance = Number(maxDistance);

      // Validate ageRange if present
      if (
        ageRange &&
        (!Array.isArray(ageRange) ||
          ageRange.length !== 2 ||
          ageRange.some(isNaN))
      ) {
        res.status(400).json({
          message: "Invalid age range format. Provide [minAge, maxAge]",
        });
        return;
      }

      // Validate maxDistance if present
      if (
        maxDistance &&
        (typeof maxDistance !== "number" || maxDistance <= 0)
      ) {
        res.status(400).json({
          message: "Invalid maxDistance. Must be a positive number",
        });
        return;
      }
      if (!ageRange && !maxDistance && !interested_in) {
        res.status(400).json({
          message: "No valid preferences provided",
        });
        return;
      }
      if (
        interested_in &&
        !["men", "women", "non-binary", "transgender", "everyone"].includes(
          interested_in
        )
      ) {
        res.status(400).json({
          message: "Invalid interested_in value",
        });
        return;
      }

      // Prepare the update object
      const updateData: any = {};

      if (ageRange) updateData["preferences.ageRange"] = ageRange;
      if (maxDistance) updateData["preferences.maxDistance"] = maxDistance;
      if (interested_in) updateData["interested_in"] = interested_in;

      // Update the user preferences
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, select: "preferences" }
      );

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({ message: "Preferences updated successfully" });
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getMatches: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const matches = await Match.find({ users: { $in: [userId] } }).populate(
        "users",
        "full_name avatar gender location bio date_of_birth"
      );

      if (!matches) {
        res.status(404).json({ message: "Matches not found" });
        return;
      }

      const matchedUsers = matches
        .map((match) => {
          // `users` is an array of populated User documents
          const otherUser = match.users.find(
            (u: any) => u._id.toString() !== userId.toString()
          );
          return otherUser;
        })
        .filter(Boolean);

      res.status(200).json({
        message: "matches retrieced successfully",
        data: matchedUsers,
      });
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  getUsersWhoLikedMe: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      const swipes = await Swipe.find({
        targetUserId: userId,
        type: { $ne: "dislike" },
      }).populate<{ userId: IUser }>(
        "userId",
        "full_name avatar gender location bio date_of_birth"
      );

      const response = swipes.map((swipe) => {
        return {
          _id: swipe.userId._id,
          full_name: swipe.userId.full_name,
          avatar: swipe.userId.avatar,
          gender: swipe.userId.gender,
          location: swipe.userId.location,
          bio: swipe.userId.bio,
          date_of_birth: swipe.userId.date_of_birth,
        };
      });

      res.status(200).json({
        message: "Filtered users who liked you",
        data: response,
      });
    } catch (error) {
      console.error("Error fetching users who liked me:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  getUserNotifications: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const unread = req.query.unread === "true";

      const filter: any = { userId };
      if (unread) filter.isRead = false;

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const totalNotifications = await Notification.countDocuments(filter);

      res.status(200).json({
        message: "Notifications retrieved successfully",
        data: notifications,
        pagination: {
          page,
          limit,
          totalNotifications,
          totalPages: Math.ceil(totalNotifications / limit),
          hasNextPage: page * limit < totalNotifications,
        },
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  markNotificationsRead: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const { notificationIds } = req.body;

      if (
        !notificationIds ||
        !Array.isArray(notificationIds) ||
        notificationIds.length === 0
      ) {
        res.status(400).json({ message: "Invalid notification IDs" });
        return;
      }

      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId },
        { $set: { isRead: true } }
      );

      res.status(200).json({ message: "Notifications marked as read" });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  editProfile: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;
      const {
        full_name,
        bio,
        email,
        relationship_preference,
        interested_in,
        max_distance,
        age_range,
      } = req.body;

      if (relationship_preference) {
        if (
          relationship_preference !== "Long-Term" &&
          relationship_preference !== "Marriage" &&
          relationship_preference !== "Short-Term" &&
          relationship_preference !== "Friends" &&
          relationship_preference !== "Other"
        ) {
          res
            .status(400)
            .json({ message: "Invalid relationship preference provided" });
          return;
        }
      }

      // Update user profile with provided data
      if (full_name) user.full_name = full_name;
      if (bio) user.bio = bio;
      if (email) user.email = email;
      if (relationship_preference)
        user.relationship_preference = relationship_preference;
      if (interested_in) user.interested_in = interested_in;
      if (max_distance) user.preferences.maxDistance = max_distance;
      if (age_range) {
        user.preferences.ageRange = age_range;
      }
      user.updatedAt = new Date();
      await user.save();

      res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  addPhotoToGallery: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const photo = req.file.path;

      if (!photo) {
        res.status(400).json({ message: "Missing photo" });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      user.photos.push(photo);
      await user.save();

      res.status(200).json({ message: "Photo added to gallery" });
    } catch (error) {
      console.error("Error adding photo to gallery:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  removePhotoFromGallery: async (req: Request, res: Response) => {
    try {
      let { index } = req.body;

      if (index === undefined) {
        res.status(400).json({ message: "Missing Index" });
        return;
      }
      index = parseInt(index);

      const user = res.locals.user;

      if (index >= 0 && index < user.photos.length) {
        user.photos.splice(index, 1);
        await user.save();
      } else {
        res.status(400).json({ message: "Invalid index" });
        return;
      }

      res.status(200).json({ message: "Photo removed from gallery" });
    } catch (error) {
      console.error("Error removing photo from gallery:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  updateProfileImage: async (req: Request, res: Response) => {
    try {
      const photo = req.file.path;

      if (!photo) {
        res.status(400).json({ message: "Missing photo" });
        return;
      }

      const user = res.locals.user;

      user.avatar = photo;
      await user.save();

      res.status(200).json({ message: "Profile image updated successfully" });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  getUserWithId: async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        res.status(404).json({ message: "missing user Id" });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(400).json({ message: "user not found" });
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
      res.status(500).json({ message: "server error" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Missing request body" });
      }

      const userId = res.locals.user._id;
      const { blockId } = req.body;

      if (!blockId) {
        res.status(400).json({ message: "Block ID is required" });
        return;
      }

      const existing = await Block.findOne({
        blocker: userId,
        blocked: blockId,
      });

      if (existing) {
        await Block.deleteOne({ _id: existing._id });
        return res.status(200).json({ message: "Unblocked" });
      }

      await Block.create({ blocker: userId, blocked: blockId });
      return res.status(200).json({ message: "Blocked" });
    } catch (error) {
      console.error("Error blocking user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getBlockedUsers: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user._id;

      const blocks = await Block.find({ blocker: userId }).populate<{
        blocked: IUser;
      }>("blocked", "full_name avatar");
      const formattedBlocks = await Promise.all(
        blocks.map((block) => {
          return {
            _id: block.blocked._id,
            avatarUrl: block?.blocked?.avatar,
            displayName: block?.blocked?.full_name,
          };
        })
      );

      res.status(200).json({
        message: "Blocked users fetched successfully",
        data: formattedBlocks,
      });
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
