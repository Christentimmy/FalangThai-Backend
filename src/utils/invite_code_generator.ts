import UserModel from "../models/user_model";

/**
 * Generates a unique invite code based on username
 * Format: USERNAME + 4 random characters
 * Example: JOHN2K9X, ALICE7M3P
 */
export const generateInviteCode = async (
  displayName: string | undefined,
  userId: string
): Promise<string> => {
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const code = createCode(displayName, userId);
    
    // Check if code already exists in database
    const existing = await UserModel.findOne({ inviteCode: code });
    
    if (!existing) {
      return code;
    }
    
    attempts++;
  }

  // Fallback: Use pure random code if username-based fails
  return createRandomCode();
};

/**
 * Creates code from username + random chars
 */
const createCode = (displayName: string | undefined, userId: string): string => {
  // Get username part (first 4 chars of displayName or userId)
  let usernamePart = "";
  
  if (displayName && displayName.length > 0) {
    usernamePart = displayName
      .replace(/[^a-zA-Z0-9]/g, "") // Remove special chars
      .substring(0, 4)
      .toUpperCase();
  }
  
  // If username too short, use userId
  if (usernamePart.length < 4) {
    usernamePart = userId.substring(0, 4).toUpperCase();
  }

  // Generate 4 random alphanumeric characters
  const randomPart = generateRandomString(4);

  return `${usernamePart}${randomPart}`;
};

/**
 * Pure random code generator (fallback)
 */
const createRandomCode = (): string => {
  return generateRandomString(8);
};

/**
 * Generates random alphanumeric string
 */
const generateRandomString = (length: number): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};