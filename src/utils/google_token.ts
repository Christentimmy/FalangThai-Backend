import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();

const google_secret = process.env.GOOGLE_CLIENT_ID;

if (!google_secret) {
  throw new Error("GOOGLE_CLIENT_ID is missing in .env");
}

const client = new OAuth2Client(google_secret);

export async function verifyGoogleToken(token: string) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: google_secret,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token");

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    sub: payload.sub, // Google user id
  };
}
