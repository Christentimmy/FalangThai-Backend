import mongoose, { Schema } from "mongoose";
import { IWithdrawalRequest } from "../types/commission_type";

const withdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "EUR",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "paypal", "stripe"],
      required: true,
    },
    paymentDetails: {
      accountHolderName: String,
      iban: String,
      bankName: String,
      paypalEmail: String,
      stripeAccountId: String,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
    },
    transactionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
withdrawalRequestSchema.index({ userId: 1, status: 1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IWithdrawalRequest>(
  "WithdrawalRequest",
  withdrawalRequestSchema
);
