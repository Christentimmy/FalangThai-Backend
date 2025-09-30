import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const dbUrl = process.env.MONGO_DB_URL!;

export async function connectToDatabase() {
    try {
        await mongoose.connect(dbUrl);
        console.log("Connected To DB");
    } catch (error) {
        console.error("Database connection error:", error);
    }
}
