import { Document, Types } from "mongoose";
import { IUser } from "./user_type";

export interface IBlock extends Document {
    blocker: IUser | Types.ObjectId;
    blocked: IUser | Types.ObjectId;
    blockedAt: Date;
}
