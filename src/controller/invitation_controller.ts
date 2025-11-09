import { Request, Response } from "express";
import UserModel from "../models/user_model";
import InvitationRedemptionModel from "../models/invitation_redemption_model";
import { generateInviteCode } from "../utils/invite_code_generator";
import { INVITATION_REWARDS, applyReward } from "../config/rewards";
import { sendPushNotification, NotificationType } from "../config/onesignal";
import { IUser } from "../types/user_type";

export const invitationController = {
  getMyInviteCode: async (req: Request, res: Response) => {
    try {
      const user : IUser = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (user.inviteCode) {
        res.status(200).json({
          inviteCode: user.inviteCode,
          shareMessage: `Join our app and get ${INVITATION_REWARDS.INVITEE.amount} free premium searches! Use my invite code: ${user.inviteCode}`,
        });
        return;
      }

      // Generate new invite code
      const inviteCode = await generateInviteCode(
        user.full_name,
        user._id.toString()
      );

      user.inviteCode = inviteCode;
      await user.save();

      res.status(200).json({
        message: "Invite code generated successfully",
        data: {
          inviteCode: user.inviteCode,
          shareMessage: `Join our app and get ${INVITATION_REWARDS.INVITEE.amount} free premium searches! Use my invite code: ${user.inviteCode}`,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  /**
   * Redeem an invite code
   * POST /api/invitations/redeem
   * Body: { inviteCode: string }
   */
  redeemInviteCode: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }

      const { inviteCode } = req.body;
      if (!inviteCode || typeof inviteCode !== "string") {
        res.status(400).json({ message: "Invite code is required" });
        return;
      }

      const normalizedCode = inviteCode.trim().toUpperCase();

      // Check if user already redeemed this code
      const alreadyRedeemed = await InvitationRedemptionModel.findOne({
        inviteCode: normalizedCode,
        redeemedBy: user._id,
      });

      if (alreadyRedeemed) {
        res.status(400).json({ message: "You already redeemed this code" });
        return;
      }

      // Find the inviter by invite code
      const inviter : IUser = await UserModel.findOne({ inviteCode: normalizedCode });
      if (!inviter) {
        res.status(404).json({ message: "Invalid invite code" });
        return;
      }

      // Prevent self-invite
      if (inviter._id.toString() === user._id.toString()) {
        res.status(400).json({ 
          message: "You cannot use your own invite code" 
        });
        return;
      }

      // Check if user was already invited by someone
      if (user.invitedBy) {
        res.status(400).json({
          message: "You have already been invited by another user",
        });
        return;
      }

      // Apply rewards to both users
      const inviterRewardResult = applyReward(
        inviter.premiumCredits,
        inviter.premiumExpiresAt,
        INVITATION_REWARDS.INVITER
      );

      const inviteeRewardResult = applyReward(
        user.premiumCredits,
        user.premiumExpiresAt,
        INVITATION_REWARDS.INVITEE
      );

      // Update inviter
      inviter.premiumCredits = inviterRewardResult.credits;
      inviter.premiumExpiresAt = inviterRewardResult.expiresAt;
      inviter.totalInvites += 1;
      await inviter.save();

      // Update invitee
      user.premiumCredits = inviteeRewardResult.credits;
      user.premiumExpiresAt = inviteeRewardResult.expiresAt;
      user.invitedBy = inviter._id;

      await user.save();

      // Record redemption
      await InvitationRedemptionModel.create({
        inviteCode: normalizedCode,
        inviterId: inviter._id,
        redeemedBy: user._id,
        rewardGiven: {
          inviterReward: {
            type: INVITATION_REWARDS.INVITER.type,
            amount: INVITATION_REWARDS.INVITER.amount,
          },
          inviteeReward: {
            type: INVITATION_REWARDS.INVITEE.type,
            amount: INVITATION_REWARDS.INVITEE.amount,
          },
        },
      });

      sendPushNotification(
        inviter._id.toString(),
        inviter.one_signal_id,
        NotificationType.INVITE,
        `Your friend ${user.full_name} redeemed your invite code!`
      );

      res.status(200).json({
        message: "Invite code redeemed successfully!",
        reward: {
          type: INVITATION_REWARDS.INVITEE.type,
          amount: INVITATION_REWARDS.INVITEE.amount,
          creditsRemaining: user.premiumCredits,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  /**
   * Get user's invitation statistics
   * GET /api/invitations/stats
   */
  getInviteStats: async (req: Request, res: Response) => {
    try {
      const user = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const redemptions = await InvitationRedemptionModel.find({
        inviterId: user._id,
      })
        .populate<{ redeemedBy: IUser }>("redeemedBy", "displayName avatar")
        .sort({ redeemedAt: -1 });

      const recentInvites = redemptions.map((r) => ({
        displayName: r.redeemedBy.full_name,
        avatar: r.redeemedBy.avatar,
        redeemedAt: r.redeemedAt,
        rewardGiven: r.rewardGiven.inviterReward,
      }));

      res.status(200).json({
        message: "Invitation statistics retrieved successfully",
        data: {
          inviteCode: user.inviteCode || null,
          totalInvites: user.totalInvites,
          premiumCredits: user.premiumCredits,
          premiumExpiresAt: user.premiumExpiresAt || null,
          recentInvites,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  /**
   * Get current premium status
   * GET /api/invitations/premium-status
   */
  getPremiumStatus: async (req: Request, res: Response) => {
    try {
      const user = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const hasActiveSubscription = user.subscription.status === "active";
      const hasCredits = user.premiumCredits > 0;

      let hasTimeBasedPremium = false;
      if (user.premiumExpiresAt) {
        hasTimeBasedPremium = new Date(user.premiumExpiresAt) > new Date();
      }

      res.status(200).json({
        hasPremiumAccess:
          hasActiveSubscription || hasCredits || hasTimeBasedPremium,
        subscription: {
          isActive: hasActiveSubscription,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
        },
        credits: {
          available: user.premiumCredits,
        },
        timeBasedPremium: {
          active: hasTimeBasedPremium,
          expiresAt: user.premiumExpiresAt || null,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
