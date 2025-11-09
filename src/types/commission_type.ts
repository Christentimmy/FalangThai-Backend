import { Document, Types } from "mongoose";

export interface ICommission extends Document {
  _id: Types.ObjectId;
  referrerId: Types.ObjectId; // User who referred
  referredUserId: Types.ObjectId; // User who subscribed
  subscriptionId: string; // Stripe subscription ID
  planId: string; // Which plan was purchased
  subscriptionAmount: number; // Total subscription price
  commissionAmount: number; // 20% commission
  commissionRate: number; // 0.20 (20%)
  currency: string; // EUR
  status: "pending" | "paid" | "cancelled";
  paidAt?: Date;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWithdrawalRequest extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "rejected" | "cancelled";
  paymentMethod: "bank_transfer" | "paypal" | "stripe";
  paymentDetails: {
    // For bank transfer
    accountHolderName?: string;
    iban?: string;
    bankName?: string;
    // For PayPal
    paypalEmail?: string;
    // For Stripe
    stripeAccountId?: string;
  };
  processedAt?: Date;
  processedBy?: Types.ObjectId; // Admin who processed
  rejectionReason?: string;
  transactionId?: string; // External transaction reference
  createdAt: Date;
  updatedAt: Date;
}
