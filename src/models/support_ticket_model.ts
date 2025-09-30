import mongoose, { Schema } from "mongoose";
import { ISupportTicket } from "../types/support_ticket_type";

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    attachments: [{ type: String }],
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const SupportTicket = mongoose.model<ISupportTicket>(
  "SupportTicket",
  SupportTicketSchema
);
