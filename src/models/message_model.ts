
import mongoose, { Schema } from "mongoose";
import { IMessageDocument } from "../types/message_type";

const messageSchema = new Schema<IMessageDocument>(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: false,
    },
    replyToMessage: { type: Object, required: false },
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: false,
    },
    avater: { type: String, required: false },
    iv: { type: String, required: false },
    mediaIv: { type: String, required: false },
    messageType: {
      type: String, // 'text', 'image', 'video', etc.
      default: "text",
    },
    mediaUrl: { type: String, required: false },
    multipleImages: [
      {
        mimetype: { type: String, required: true },
        mediaUrl: { type: String, required: true },
        mediaIv: { type: String, required: true },
      },
    ],
    clientGeneratedId: { type: String, required: false },
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    status: {
      type: String, // 'sent', 'delivered', 'read'
      default: "sent",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    storyMediaUrl: { type: String, required: false },
  },
  { timestamps: true }
);

const Message = mongoose.model<IMessageDocument>("Message", messageSchema);

export default Message;

