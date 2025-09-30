import mongoose, { Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: "match" | "message" | "like" | "super_like" | "system";
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}
