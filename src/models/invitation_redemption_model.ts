
import mongoose from "mongoose";
import { IInvitationRedemptionType } from "../types/invitation_type";

const invitationRedemptionSchema = new mongoose.Schema<IInvitationRedemptionType>(
  {
    inviteCode: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rewardGiven: {
      inviterReward: {
        type: {
          type: String,
          enum: ["credits", "time"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
      inviteeReward: {
        type: {
          type: String,
          enum: ["credits", "time"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: prevents same user from redeeming same code twice
invitationRedemptionSchema.index(
  { inviteCode: 1, redeemedBy: 1 },
  { unique: true }
);

const InvitationRedemptionModel = mongoose.model<IInvitationRedemptionType>(
  "InvitationRedemption",
  invitationRedemptionSchema
);

export default InvitationRedemptionModel;