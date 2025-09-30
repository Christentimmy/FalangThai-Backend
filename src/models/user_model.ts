import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
  avatar?: string;
  bio?: string;
  gender: "male" | "female" | "others" | "prefer_not_to_say";
  interested_in: "male" | "female" | "both" | "others" | "prefer_not_to_say";
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
}

const UserSchema = new Schema<IUser>(
  {
    full_name: { type: String, default: "" },
    email: { type: String, unique: true, lowercase: true, sparse: true },
    phone_number: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["male", "female", "others", "prefer_not_to_say"],
    },
    interested_in: {
      type: String,
      enum: ["male", "female", "both", "others", "prefer_not_to_say"],
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
      ageRange: { type: [Number], default: [18, 50] },
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
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
