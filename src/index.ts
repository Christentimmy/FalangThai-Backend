

import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectToDatabase } from "./config/database";

import authRoutes from "./routes/auth_routes";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
connectToDatabase();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});