import mongoose, { Schema } from "mongoose";
import { IUser } from "../types/user_type";

const UserSchema = new Schema<IUser>(
  {
    full_name: { type: String, default: "" },
    email: { type: String, unique: true, lowercase: true, sparse: true },
    phone_number: { type: String, unique: true, sparse: true },
    password: { type: String },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "others", "prefer_not_to_say"],
    },
    interested_in: {
      type: String,
      enum: ["men", "women", "non-binary", "transgender", "everyone"],
    },
    date_of_birth: { type: Date },
    location: {
      type: { type: String, default: "Point" },
      address: { type: String, default: "" },
      coordinates: { type: [Number], default: [0.0, 0.0], index: "2dsphere" },
    },
    photos: [{ type: String }],
    hobbies: [{ type: String }],
    preferences: {
      ageRange: { type: [Number], default: [18, 150] },
      maxDistance: { type: Number, default: 50 },
    },
    role: {
      type: String,
      enum: ["user", "super_admin", "sub_admin", "staff"],
      default: "user",
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive", "banned", "blocked"],
    },
    profile_completed: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    is_email_verified: { type: Boolean, default: false },
    is_phone_number_verified: { type: Boolean, default: false },
    last_active: { type: Date, default: Date.now },
    one_signal_id: {
      type: String,
      default: "",
    },
    relationship_preference: {
      type: String,
      enum: ["Long-Term", "Marriage", "Short-Term", "Friends", "Other"],
      default: "Long-Term",
    },
    stripeCustomerId: { type: String },
    subscription: {
      planId: { type: String },
      status: {
        type: String,
        enum: [
          "active",
          "canceled",
          "past_due",
          "unpaid",
          "incomplete",
          "none",
        ],
        default: "none",
      },
      currentPeriodEnd: { type: Date },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    premiumCredits: {
      type: Number,
      default: 0,
    },
    // notificationSettings: {
      // general: { type: Boolean, default: true },
      // trendingPost: { type: Boolean, default: true },
      // newComments: { type: Boolean, default: true },
      // alertForWomenNames: { type: Boolean, default: true },
      // reactions: { type: Boolean, default: true },
    // },
    premiumExpiresAt: {
      type: Date,
    },
    totalInvites: {
      type: Number,
      default: 0,
    },
    // Referral commission wallet
    wallet: {
      balance: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: "EUR",
      },
      totalEarned: {
        type: Number,
        default: 0,
      },
      totalWithdrawn: {
        type: Number,
        default: 0,
      },
    },
    // Payment information for withdrawals
    paymentInfo: {
      preferredMethod: {
        type: String,
        enum: ["bank_transfer", "paypal", "stripe"],
      },
      bankTransfer: {
        accountHolderName: String,
        accountNumber: String,
        bankName: String,
      },
      paypal: {
        email: String,
      },
      stripe: {
        accountId: String,
      },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
