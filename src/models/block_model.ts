import { Schema, model, Types } from "mongoose";
import { IBlock } from "../types/block_type";

const blockSchema = new Schema<IBlock>(
  {
    blocker: { type: Types.ObjectId, ref: "User", required: true },
    blocked: { type: Types.ObjectId, ref: "User", required: true },
    blockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocker: 1 });
blockSchema.index({ blocked: 1 });


export const Block = model<IBlock>("Block", blockSchema);
