import { Document, Types } from "mongoose";

interface INotificationSettings {
  // general: boolean;
  // trendingPost: boolean;
  // newComments: boolean;
  // alertForWomenNames: boolean;
  // reactions: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
  avatar?: string;
  bio?: string;
  gender: "male" | "female" | "others" | "prefer_not_to_say";
  interested_in: "men" | "women" | "non-binary" | "transgender" | "everyone";
  date_of_birth: Date;
  location: {
    type: string;
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  photos: string[];
  hobbies: string[];
  preferences: {
    ageRange: [number, number];
    maxDistance: number;
  };
  is_email_verified: boolean;
  is_phone_number_verified: boolean;
  profile_completed: boolean;
  role: "user" | "super_admin" | "sub_admin" | "staff";
  status: "active" | "inactive" | "banned" | "blocked";
  last_active: Date;
  createdAt: Date;
  updatedAt: Date;
  one_signal_id: string;
  relationship_preference:
    | "Long-Term"
    | "Marriage"
    | "Short-Term"
    | "Friends"
    | "Other";
  isVerified: boolean;
  isDeleted: boolean;
  stripeCustomerId: string;
  subscription: {
    planId: string;
    status:
      | "active"
      | "canceled"
      | "past_due"
      | "unpaid"
      | "incomplete"
      | "none";
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
  inviteCode: string;
  invitedBy: Types.ObjectId;
  premiumCredits: number;
  premiumExpiresAt: Date;
  totalInvites: number;
  wallet: {
    balance: number;
    currency: string;
    totalEarned: number;
    totalWithdrawn: number;
  };
  paymentInfo: {
    preferredMethod?: "bank_transfer" | "paypal" | "stripe";
    bankTransfer?: {
      accountHolderName?: string;
      accountNumber?: string;
      bankName?: string;
    };
    paypal?: {
      email?: string;
    };
    stripe?: {
      accountId?: string;
    };
  };
}
