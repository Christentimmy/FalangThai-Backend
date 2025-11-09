import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectToDatabase } from "./config/database";
import { setupSocket } from "./config/socket";

import authRoutes from "./routes/auth_routes";
import messageRoutes from "./routes/message_route";
import supportTicketRoutes from "./routes/support_ticket_routes";
import storyRoutes from "./routes/story_routes";
import userRoutes from "./routes/user_routes";
import subscriptionRoutes from "./routes/subscription_routes";
import { handleWebhook } from "./services/stripe_service";
import invitationRoutes from "./routes/invitation_routes";

import bodyParser from "body-parser";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.set("trust proxy", 1);
app.use(morgan("dev"));
app.post(
  "/api/subscription/webhook",
  bodyParser.raw({ type: "application/json" }),
  handleWebhook
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/story", storyRoutes);
app.use("/api/support", supportTicketRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/invitations", invitationRoutes);

connectToDatabase();

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

setupSocket(server);
