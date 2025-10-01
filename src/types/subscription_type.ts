import mongoose, { Document } from "mongoose";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: "active" | "canceled" | "past_due" | "unpaid" | "incomplete";
  planId: string;
  planName: string;
  priceId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}
