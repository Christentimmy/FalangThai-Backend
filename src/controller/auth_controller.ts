import { Request, Response } from "express";
import userSchema from "../models/user_model";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";
import generateToken from "../utils/token_generator";
import { redisController } from "../controller/redis_controller";
import { sendOTP } from "../services/email_service";

dotenv.config();
const token_secret = process.env.TOKEN_SECRET;

if (!token_secret) {
  throw new Error("TOKEN_SECRET is missing in .env");
}

export const authController = {
  signUpUser: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Bad Request" });
        return;
      }
      const { email, password, fullName } = req.body;

      if (!email || !password || !fullName) {
        res.status(400).json({
          message: "Email, Password, and Full Name are required",
        });
        return;
      }

      const existingUser = await userSchema.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          message: "User Already With Email Already Exist",
        });
        return;
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      const newUser = new userSchema({
        email: email,
        password: hashedPassword,
        role: "user",
      });

      const min = Math.pow(10, 3);
      const max = Math.pow(10, 4) - 1;
      const otp: string = (
        Math.floor(Math.random() * (max - min + 1)) + min
      ).toString();

      const result = await sendOTP(email, otp);

      if (result.success === false) {
        res.status(400).json({
          message: "Error sending email",
          data: { error: result },
        });
        return;
      }

      await redisController.saveOtpToStore(email, otp.toString());
      const token = generateToken(newUser);

      await newUser.save();

      res.status(201).json({
        message: "User registered successfully",
        userId: newUser._id,
        token: token,
      });
    } catch (error) {
      console.error(`SignUpUserController: ${error}`);
      res.status(500).json({ message: "Server error" });
    }
  },

  verifyOTP: async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;

      if (!otp) {
        res.status(400).json({ message: "OTP is required" });
        return;
      }

      const storedOtp = await redisController.getOtpFromStore(email);
      if (!storedOtp) {
        res.status(400).json({ message: "Invalid OTP" });
        return;
      }

      if (otp !== storedOtp) {
        res.status(400).json({ message: "Invalid OTP" });
        return;
      }

      const user = await userSchema.findOne({ email });
      if (!user) {
        res.status(404).json({ message: "User Not Found" });
        return;
      }

      if (email?.trim() && user.email !== email) {
        res.status(400).json({ message: "Invalid email address" });
        return;
      }

      if (!user.is_email_verified) {
        user.is_email_verified = true;
      }

      await user.save();
      res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Something went wrong" });
    }
  },

  sendOTp: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }
      const user = await userSchema.findOne({ email });
      if (!user) {
        res.status(404).json({ message: "User Not Found" });
        return;
      }

      const min = Math.pow(10, 3);
      const max = Math.pow(10, 4) - 1;
      const otp: string = (
        Math.floor(Math.random() * (max - min + 1)) + min
      ).toString();

      await redisController.saveOtpToStore(email, otp.toString());

      const result = await sendOTP(user.email, otp);

      if (result.success === false) {
        res
          .status(400)
          .json({ message: "Error sending email", data: { error: result } });
        return;
      }
      res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("❌ Error in sendOTP:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  completeProfile: async (req: Request, res: Response) => {
    try {
      let { bio, dob } = req.body;
      const userId = res.locals.userId;

      if (!bio || !dob) {
        res.status(400).json({
          message: "All fields (bio, dob) are required",
        });
        return;
      }

      const parsedDob = new Date(dob);

      if (isNaN(parsedDob.getTime())) {
        return res.status(400).json({
          message: "Invalid date format for dob",
        });
      }

      if (!req.file) {
        res.status(400).json({ message: "Profile picture is required" });
        return;
      }

      let imageUrl: string = req.file.path;
      const user = await userSchema.findById(userId);

      if (!user) {
        res.status(404).json({ message: "User does not exist" });
        return;
      }

      if (!user.is_email_verified) {
        res.status(400).send({ message: "User need to verify your email" });
        return;
      }

      if (user.profile_completed === true) {
        res.status(400).send({ message: "Profile already completed" });
        return;
      }

      user.bio = bio;
      user.date_of_birth = parsedDob;
      user.avatar = imageUrl;

      await user.save();
      res.status(200).json({ message: "profile completed successfully" });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
};
