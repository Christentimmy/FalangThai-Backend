import jwt from "jsonwebtoken";
import { Socket } from "socket.io";
import userSchema from "../models/user_model";
import dotenv from "dotenv";
dotenv.config();

const token_secret = process.env.TOKEN_SECRET;

const authenticateSocket = async (socket: Socket, next: (err?: any) => void) => {
    try {
        const token = socket.handshake.headers.authorization?.split(" ")[1];

        if (!token) {
            next(new Error("Authentication error: No token provided"));
            return;
        }

        // Verify the token
        const decoded: any = jwt.verify(token, token_secret!);

        const user = await userSchema.findById(decoded.id);

        if (!user) {
            next(new Error("Authentication error: User not found"));
            return;
        }

        socket.data.user = user;
        next();
    } catch (error) {
        next(new Error("Authentication error: Invalid token"));
        console.table(error);
    }
};

export default authenticateSocket;

