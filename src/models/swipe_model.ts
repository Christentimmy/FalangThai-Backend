import { Schema, model } from "mongoose";
import { ISwipe } from "../types/swipe_type";

const swipeSchema = new Schema<ISwipe>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "pass", "superlike"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Ensure a user can’t swipe twice on the same target
swipeSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });

export const Swipe = model<ISwipe>("Swipe", swipeSchema);
