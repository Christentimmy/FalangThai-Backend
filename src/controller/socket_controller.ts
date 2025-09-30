import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import userSchema from "../models/user_model";
import Message from "../models/message_model";
import { sendPushNotification, NotificationType } from "../config/onesignal";
import { encrypt, decrypt } from "../utils/encryption";
import { IMessageDocument } from "../types/message_type";
import { Block } from "../models/block_model";

dotenv.config();

function sendMessage(
  io: Server,
  socket: Socket,
  onlineUsers: Map<string, string>,
  senderId: string
) {
  socket.on("send-message", async (data) => {
    try {
      if (typeof data === "string") {
        data = JSON.parse(data);
      }

      const {
        receiverId,
        message,
        messageType,
        mediaUrl,
        mediaIv,
        multpleMedia,
        clientGeneratedId,
        replyToMessageId,
        storyMediaUrl,
      } = data;

      if (!senderId || !receiverId || !messageType || !clientGeneratedId) {
        console.error("Invalid message data");
        return;
      }

      if (receiverId === senderId) {
        return socket.emit("error", {
          message: "You cannot send messages to yourself.",
        });
      }

      const user = await userSchema.findById(senderId);
      const blocked = await Block.findOne({
        $or: [
          { blocker: senderId, blocked: receiverId },
          { blocker: receiverId, blocked: senderId },
        ],
      });

      if (blocked) {
        return socket.emit("blocked", {
          message: "This user is blocked.",
        });
      }

      var replyToMessage: IMessageDocument | null = null;
      if (replyToMessageId !== null && replyToMessageId !== undefined) {
        replyToMessage = await Message.findById(replyToMessageId);
      }

      const encryptedMessage = encrypt(message);

      if (!encryptedMessage) {
        console.error("Failed to encrypt message:", message);
        return socket.emit("error", { message: "Failed to encrypt message." });
      }

      if (
        multpleMedia &&
        !Array.isArray(multpleMedia) &&
        multpleMedia.length <= 0
      ) {
        console.error("Invalid media files provided:", multpleMedia);
        return socket.emit("error", { message: "No media files provided." });
      }
      if (multpleMedia) {
        for (const media of multpleMedia) {
          if (!media.mediaUrl || !media.mediaIv) {
            console.error("Invalid media file:", media);
            return socket.emit("error", { message: "Invalid media file." });
          }
        }
      }

      const newMessage = await Message.create({
        senderId,
        receiverId,
        message: message ? encryptedMessage.data : null,
        messageType,
        mediaUrl: mediaUrl || null,
        multipleImages: multpleMedia,
        iv: message ? encryptedMessage.iv : null,
        mediaIv: mediaIv || null,
        status: "sent",
        clientGeneratedId: clientGeneratedId || null,
        avater: user?.avatar || null,
        replyToMessage: replyToMessage || null,
        replyToMessageId: replyToMessageId || null,
        storyMediaUrl: storyMediaUrl || null,
      });

      let decryptedReplyToMessage: IMessageDocument | null = replyToMessage;
      if (
        decryptedReplyToMessage !== null &&
        decryptedReplyToMessage.mediaUrl !== null
      ) {
        decryptedReplyToMessage.mediaUrl = decrypt(
          decryptedReplyToMessage.mediaUrl!,
          decryptedReplyToMessage.mediaIv!
        );
      }

      if (
        decryptedReplyToMessage !== null &&
        decryptedReplyToMessage.message !== null
      ) {
        decryptedReplyToMessage.message = decrypt(
          decryptedReplyToMessage.message!,
          decryptedReplyToMessage.iv!
        );
      }

      let decryptedMessage = newMessage;
      if (decryptedMessage.mediaUrl !== null) {
        decryptedMessage.mediaUrl = decrypt(
          decryptedMessage.mediaUrl!,
          decryptedMessage.mediaIv!
        );
      }

      if (decryptedMessage.message !== null) {
        decryptedMessage.message = decrypt(
          decryptedMessage.message!,
          decryptedMessage.iv!
        );
      }
      if (
        decryptedMessage.multipleImages &&
        decryptedMessage.multipleImages.length > 0
      ) {
        decryptedMessage.multipleImages = decryptedMessage.multipleImages.map(
          (image) => ({
            ...image,
            mediaUrl: decrypt(image.mediaUrl!, image.mediaIv!),
          })
        );
      }
      if (
        decryptedReplyToMessage !== null &&
        decryptedReplyToMessage.multipleImages &&
        decryptedReplyToMessage.multipleImages.length > 0
      ) {
        decryptedReplyToMessage.multipleImages =
          decryptedReplyToMessage.multipleImages.map((image) => ({
            ...image,
            mediaUrl: decrypt(image.mediaUrl, image.mediaIv),
          }));
      }

      decryptedMessage.replyToMessageId = decryptedReplyToMessage!;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", decryptedMessage);
      }

      // Emit the message back to the sender so they can see it as well
      if (onlineUsers.has(senderId)) {
        io.to(onlineUsers.get(senderId)!).emit(
          "receive-message",
          decryptedMessage
        );
      }

      if (onlineUsers.has(receiverId)) {
        io.to(onlineUsers.get(receiverId)!).emit("update-chat-list");
      }

      const receiver = await userSchema.findById(receiverId);

      if (receiver.one_signal_id) {
        await sendPushNotification(
          receiverId,
          receiver.one_signal_id,
          NotificationType.MESSAGE,
          `${socket.data.user.displayName} sent new message`
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });
}

function markMessageAsRead(
  io: Server,
  socket: Socket,
  onlineUsers: Map<string, string>,
  senderId: string
) {
  socket.on("mark-message-read", async (data) => {
    try {
      if (typeof data === "string") {
        data = JSON.parse(data);
      }

      const { receiverId } = data;
      if (!receiverId || !senderId) {
        console.error("Invalid data for marking messages as read");
        return;
      }

      // Corrected query (mark messages as read for the current user)
      await Message.updateMany(
        { senderId: receiverId, receiverId: senderId, status: "sent" },
        { $set: { status: "read" } }
      );

      // Get updated unread count
      const unreadCount = await Message.countDocuments({
        receiverId: senderId,
        status: "sent",
      });

      // Notify the current user of their new unread count
      if (onlineUsers.has(senderId)) {
        io.to(onlineUsers.get(senderId)!).emit("update-unread-count", {
          unreadCount,
        });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });
}

export { markMessageAsRead, sendMessage };
