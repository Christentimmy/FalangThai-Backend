import { Document, Types } from "mongoose";

export interface IInvitationRedemptionType extends Document {
  _id: Types.ObjectId;
  inviteCode: string;
  inviterId: Types.ObjectId;
  redeemedBy: Types.ObjectId;
  rewardGiven: {
    inviterReward: {
      type: "credits" | "time";
      amount: number;
    };
    inviteeReward: {
      type: "credits" | "time";
      amount: number;
    };
  };
  redeemedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}