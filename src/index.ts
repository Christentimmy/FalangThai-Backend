import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectToDatabase } from "./config/database";
import { setupSocket } from "./config/socket";

import authRoutes from "./routes/auth_routes";
import messageRoutes from "./routes/message_route";
import supportTicketRoutes from "./routes/support_ticket_routes";
import userRoutes from "./routes/user_routes";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/message', messageRoutes);

connectToDatabase();

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 

setupSocket(server);
