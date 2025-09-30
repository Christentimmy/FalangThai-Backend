import multer from "multer";
import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { Request, Response, NextFunction } from "express";

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "profile_pictures",
    format: "png",
    public_id: file.originalname.split(".")[0],
  }),
});

export const uploadProfile = multer({
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  storage: profileStorage,
});

// Storage for message images/videos/audio
const messageMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "message_media",
      resource_type: "auto",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    };
  },
});

export const uploadMessageMedia = multer({
  storage: messageMediaStorage,
  limits: { fileSize: 150 * 1024 * 1024 },
});

const supportTicketStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "user_verification",
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});

export const supportUpload = multer({ storage: supportTicketStorage });
