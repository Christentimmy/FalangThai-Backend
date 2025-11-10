import mongoose, { Schema } from "mongoose";
import { ICommission } from "../types/commission_type";

const commissionSchema = new Schema<ICommission>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
    },
    subscriptionAmount: {
      type: Number,
      required: true,
    },
    commissionAmount: {
      type: Number,
      required: true,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 0.20, // 20%
    },
    currency: {
      type: String,
      required: true,
      default: "EUR",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
    stripePaymentIntentId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
commissionSchema.index({ referrerId: 1, status: 1 });
// commissionSchema.index({ referredUserId: 1 });
// commissionSchema.index({ subscriptionId: 1 });

export default mongoose.model<ICommission>("Commission", commissionSchema);
