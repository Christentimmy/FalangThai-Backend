import { Schema, model } from "mongoose";
import { IMatch } from "../types/match_type";

const MatchSchema = new Schema<IMatch>(
  {
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// ensure two users can’t have multiple match records
MatchSchema.index({ users: 1 }, { unique: true });

export const Match = model<IMatch>("Match", MatchSchema);
