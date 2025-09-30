import jwt from 'jsonwebtoken';
import { IUser } from '../types/user_type';
import dotenv from 'dotenv';
dotenv.config();

const token_secret = process.env.TOKEN_SECRET;

if (!token_secret) {
    throw new Error("TOKEN_SECRET is missing in .env");
}

function generateToken(user: IUser) {
    const token = jwt.sign({ id: user._id, role: user.role }, token_secret, {
        expiresIn: "2d",
    });
    return token;
}

export default generateToken;

