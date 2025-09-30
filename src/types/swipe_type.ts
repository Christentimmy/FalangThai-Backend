import { Schema, Document } from "mongoose";

// Types for swipe actions
export type SwipeType = "like" | "pass" | "superlike";

export interface ISwipe extends Document {
  userId: Schema.Types.ObjectId; // Who swiped
  targetUserId: Schema.Types.ObjectId; // On whom
  type: SwipeType; // like / pass / superlike
  createdAt: Date;
}
