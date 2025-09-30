import { Document, Types } from "mongoose";

// Story Interface
export interface IStory extends Document {
  userId: Types.ObjectId;
  displayName: string;
  avatarUrl: string;
  stories: {
    content?: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    publicId: string;
    mediaType: "image" | "video";
    createdAt: Date;
    expiresAt: Date;
    viewedBy: Types.ObjectId[];
  }[];
}
