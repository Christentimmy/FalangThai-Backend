
import mongoose, { Schema } from "mongoose";
import { ISubscription } from "../types/subscription_type";

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "unpaid", "incomplete"],
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    priceId: {
      type: String,
      required: true,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    canceledAt: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    trialStart: Date,
    trialEnd: Date,
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

export default mongoose.model<ISubscription>("Subscription", subscriptionSchema);