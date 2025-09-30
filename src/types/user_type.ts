import { Document } from "mongoose";

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
