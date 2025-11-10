import { Request, Response } from "express";
import userSchema from "../models/user_model";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";
import generateToken from "../utils/token_generator";
import { redisController } from "../controller/redis_controller";
import { sendOTP } from "../services/email_service";
import { verifyGoogleToken } from "../utils/google_token";
import jwt, { JwtPayload } from "jsonwebtoken";
import tokenBlacklistSchema from "../models/token_blacklist_model";
import mongoose from "mongoose";

dotenv.config();
const token_secret = process.env.TOKEN_SECRET;

if (!token_secret) {
  throw new Error("TOKEN_SECRET is missing in .env");
}

const isValidObjectId = mongoose.Types.ObjectId.isValid;

interface DecodedToken extends JwtPayload {
  id: string;
  role: string;
}

export const authController = {
  googleAuthSignUp: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token is required" });

      const googleUser = await verifyGoogleToken(token);

      let exist = await userSchema.findOne({ email: googleUser.email });
      if (exist) {
        res.status(404).json({ message: "User already exists" });
        return;
      }

      const newUser = new userSchema({
        email: googleUser.email,
        role: "user",
        is_email_verified: true,
        full_name: googleUser.name,
      });
      await newUser.save();

      const jwtToken = generateToken(newUser);

      res.status(201).json({
        message: "SignUp successful",
        token: jwtToken,
      });
    } catch (error) {
      console.error("Google signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  googleAuthSignIn: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token is required" });

      const googleUser = await verifyGoogleToken(token);

      const user = await userSchema.findOne({ email: googleUser.email });

      if (!user) {
        res.status(404).json({ message: "Invalid Credentials" });
        return;
      }
      // Check if user is banned
      if (user.status !== "active") {
        res.status(403).json({ message: "Account banned or suspended" });
        return;
      }

      // Generate token
      const jwtToken = generateToken(user);

      // Check if user profile is completed
      if (!user.profile_completed) {
        res.status(400).json({ message: "User Not Complete", token: jwtToken });
        return;
      }

      res.status(200).json({
        message: "Login Successful",
        token: jwtToken,
        email: user.email,
      });
    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  signUpUser: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Bad Request" });
        return;
      }
      const { email, password, full_name } = req.body;

      if (!email || !password || !full_name) {
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
        full_name: full_name,
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

  login: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Bad Request" });
        return;
      }

      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: "Email and Password are required" });
        return;
      }

      const user = await userSchema.findOne({ email });
      if (!user) {
        res.status(404).json({ message: "User Not Found" });
        return;
      }

      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ message: "Invalid Password" });
        return;
      }
      const token = generateToken(user);

      res.status(200).json({
        message: "Login successful",
        token: token,
      });
    } catch (error) {
      console.error(`LoginController: ${error}`);
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
        res.status(400).json({
          message: "Error sending email",
        });
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

  changeEmailOrNumber: async (req: Request, res: Response) => {
    try {
      const { email, phone_number } = req.body;
      if (!email && !phone_number) {
        res.status(400).json({ message: "Email or number required" });
        return;
      }

      const user = await userSchema.findById(res.locals.userId);
      if (!user) {
        res.status(404).json({ message: "User Not Found" });
        return;
      }

      const existEmail = await userSchema.findOne({ email });
      if (existEmail) {
        res.status(400).json({ message: "Email already exists" });
        return;
      }

      if (email) {
        user.email = email;
      }

      if (phone_number) {
        user.phone_number = phone_number;
      }

      await user.save();
      const min = Math.pow(10, 3);
      const max = Math.pow(10, 4) - 1;
      const otp: string = (
        Math.floor(Math.random() * (max - min + 1)) + min
      ).toString();

      const result = await sendOTP(user.email, otp);

      if (result.success === false) {
        res
          .status(400)
          .json({ message: "Error sending email", data: { error: result } });
        return;
      }

      await redisController.saveOtpToStore(email, otp.toString());

      res.status(200).json({
        message: "Details changed successfully, kindly request new otp",
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },

  validateToken: async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const decoded = jwt.verify(token, token_secret) as DecodedToken;

      const isBlacklisted = await tokenBlacklistSchema.findOne({ token });
      if (isBlacklisted) {
        res.status(401).json({
          message: "Token is invalid. Please log in again.",
        });
        return;
      }

      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        res.status(401).json({ message: "Token has expired." });
        return;
      }

      if (!isValidObjectId(decoded.id)) {
        res.status(400).json({ message: "Invalid user ID" });
        return;
      }
      res.status(200).json({ message: "Token is valid" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  logoutUser: async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, token_secret!) as JwtPayload;

      // Optional: ensure token belongs to a valid user
      const user = await userSchema.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Add token to blacklist (if not using short token lifespans)
      await tokenBlacklistSchema.create({ token, userId: user._id });

      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("❌ Error in logout:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  changePassword: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const { oldPassword, newPassword } = req.body;
      const user = await userSchema.findById(userId).select("+password");
      if (!user) {
        res.status(404).json({ message: "User does not exist" });
        return;
      }

      const isPasswordValid = await bcryptjs.compare(
        oldPassword,
        user.password
      );
      if (!isPasswordValid) {
        res.status(400).json({ message: "Invalid old password" });
        return;
      }
      const salt = await bcryptjs.genSalt(10);
      const password = await bcryptjs.hash(newPassword, salt);
      user.password = password;
      await user.save();
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }
      const user = await userSchema.findOne({ email });
      if (!user) {
        res.status(404).json({ message: "User does not exist" });
        return;
      }
      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);
      user.password = hashedPassword;
      await user.save();
      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("❌ Error in resetPassword:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
