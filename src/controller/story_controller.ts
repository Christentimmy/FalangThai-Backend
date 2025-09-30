import { Request, Response } from "express";
import { Story } from "../models/story_model";
import userSchema from "../models/user_model";
import mongoose from "mongoose";
import { IUser } from "../types/user_type";
import cloudinary from "../config/cloudinary";
import generateThumbnail from "../utils/generate_thumbnail";
import fs from "fs";

export const storyController = {
  createStory: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const user: IUser = res.locals.user;
      const storyFiles = req.files as Express.Multer.File[];

      if (!storyFiles || storyFiles.length === 0) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const { content } = req.body;

      let storyDoc = await Story.findOne({ userId });
      if (!storyDoc) {
        storyDoc = new Story({
          userId,
          avatarUrl: user.avatar,
          displayName: user.full_name,
          stories: [],
        });
      }

      for (let file of storyFiles) {
        const isVideo = file.mimetype.startsWith("video/");
        let thumbnailUrl = "";

        if (isVideo) {
          const thumbPath = await generateThumbnail(file.path);

          thumbnailUrl = thumbPath;

          fs.unlink(thumbPath, () => {}); // delete temp thumb
        }

        const uploadedMedia = await cloudinary.uploader.upload(file.path, {
          folder: "stories/media",
          resource_type: isVideo ? "video" : "image",
        });

        fs.unlink(file.path, () => {}); // delete uploaded file

        storyDoc.stories.push({
          content,
          mediaUrl: uploadedMedia.secure_url,
          publicId: uploadedMedia.public_id,
          mediaType: isVideo ? "video" : "image",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          viewedBy: [],
          ...(isVideo ? { thumbnailUrl } : {}),
        });
      }

      await storyDoc.save();

      res.status(201).json({
        message: "Story created successfully",
        data: storyDoc,
      });
    } catch (error) {
      console.error("Error creating story:", error);
      res.status(500).json({ message: "Failed to create story" });
    }
  },

  getUserPostedStories: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const now = new Date();

      const userStories = await Story.findOne({
        userId,
        "stories.expiresAt": { $gt: now },
      });

      if (!userStories) {
        res.status(400).json({ message: "No Story Found" });
        return;
      }
      

      res.status(200).json({
        message: "Stories fetched successfully",
        data: userStories,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get user's posted stories" });
    }
  },

  getStories: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const now = new Date();

      // Fetch user's own stories
      const userStories = await Story.find({
        userId: userId,
        "stories.expiresAt": { $gt: now },
      });

        //other stories
      const publicStories = await Story.find({
        userId: {$ne: userId},
        "stories.expiresAt": { $gt: now },
      });

      // Format the response
      const formatStories = (stories: any[]) => {
        return stories.map((story) => ({
          _id: story?._id?.toString() || "",
          userId: story?.userId?.toString() || "",
          displayName: story?.displayName || "",
          avatarUrl: story?.avatarUrl || "",
          stories: (story?.stories || []).map((s: any) => ({
            id: s?._id?.toString() || "",
            thumbnailUrl: s?.thumbnailUrl || "",
            mediaUrl: s?.mediaUrl || "",
            mediaType: s?.mediaType || "",
            content: s?.content || "",
            createdAt: s?.createdAt || new Date(),
            expiresAt: s?.expiresAt || new Date(),
            viewedBy: (s?.viewedBy || []).map(
              (id: mongoose.Types.ObjectId) => id?.toString() || ""
            ),
          })),
        }));
      };

      const formattedUserStories = formatStories(userStories || []);
      const formattedPublicStories = formatStories(publicStories || []);

      res.status(200).json({
        message: "Story Feeds",
        data: [...formattedUserStories, ...formattedPublicStories],
      });
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  },

  viewManyStories: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const storyItems = req.body.storyItems;
      const now = new Date();

      if (!Array.isArray(storyItems) || storyItems.length === 0) {
        res.status(400).json({ message: "Invalid or empty storyItems array" });
        return;
      }

      for (const item of storyItems) {
        const { storyId, storyItemId } = item;

        const storyDoc = await Story.findById(storyId);
        if (!storyDoc) continue;

        const storyItem = storyDoc.stories.find(
          (story: any) => story._id.toString() === storyItemId
        );

        if (
          !storyItem ||
          storyItem.expiresAt < now ||
          storyDoc.userId.toString() === userId
        ) {
          continue; // Skip expired, non-existent, or own story
        }

        if (!storyItem.viewedBy.includes(userId)) {
          storyItem.viewedBy.push(userId);
        }

        await storyDoc.save();
      }

      res.status(200).json({ message: "Stories marked as viewed (batched)" });
    } catch (err) {
      console.error("Batch story view error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  deleteStory: async (req: Request, res: Response) => {
    try {
      const { storyId } = req.params;
      const userId = res.locals.userId;
      const user = await userSchema.findById(userId);
      if (!user) {
        res.status(404).json({ message: "user not found" });
        return;
      }
      const story = await Story.findById(storyId);
      if (!story) {
        res.status(404).json({ message: "Story not found" });
        return;
      }
      if (user._id.toString() !== story.userId.toString()) {
        res.status(404).json({ message: "Unauthorized Access" });
        return;
      }
      const result = await Story.deleteOne({ _id: storyId });

      if (!result) {
        res.status(404).json({ message: "Story not found or not authorized" });
        return;
      }

      res.status(200).json({ message: "Story deleted successfully" });
    } catch (error) {
      console.error("Error deleting story:", error);
      res.status(500).json({ message: "Failed to delete story" });
    }
  },

  getStoryViewers: async (req: Request, res: Response) => {
    try {
      const { storyId, storyItemId } = req.params;

      if (!storyId || !storyItemId) {
        res.status(400).json({ message: "Invalid parameters" });
        return;
      }

      // Find the story document
      const storyDoc = await Story.findOne({ _id: storyId });

      if (!storyDoc) {
        res.status(404).json({ message: "Story not found" });
        return;
      }

      // Find the specific story item
      const storyItem = storyDoc.stories.find(
        (e) => e["_id"].toString() === storyItemId
      );

      if (!storyItem) {
        res.status(404).json({ message: "Story item not found" });
        return;
      }

      if (storyDoc.userId.toString() != res.locals.user._id.toString()) {
        res.status(404).json({ message: "Unauthorized Access" });
        return;
      }
      // Get the viewers of this story item
      const viewedByUsers = await userSchema
        .find({
          _id: { $in: storyItem.viewedBy },
        })
        .select("displayName avatarUrl");

      res.status(200).json({
        message: "Viewers fetched successfully",
        viewers: viewedByUsers,
      });
    } catch (error) {
      console.error("Error fetching viewers:", error);
      res.status(500).json({ message: "Failed to fetch viewers" });
    }
  },
};
