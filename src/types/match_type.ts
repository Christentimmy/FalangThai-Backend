import { Document, Types } from "mongoose";

export interface IMatch extends Document {
  users: Types.ObjectId[]; // always exactly 2 users
  createdAt: Date;
  lastMessage?: string; // optional - for chat preview
  isActive: boolean; // in case one unmatches
}
