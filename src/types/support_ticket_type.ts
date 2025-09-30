
import  {  Document, Types } from "mongoose";

export interface ISupportTicket extends Document {
    user: Types.ObjectId;
    subject: string;
    description: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high";
    attachments?: string[];
    assignedTo?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}