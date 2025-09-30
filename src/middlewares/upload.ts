
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
    storage: profileStorage
});