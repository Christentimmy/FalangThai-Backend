import { Request, Response } from "express";
import UserModel from "../models/user_model";
import InvitationRedemptionModel from "../models/invitation_redemption_model";
import Commission from "../models/commission_model";
import { generateInviteCode } from "../utils/invite_code_generator";
import { REFERRAL_CONFIG, applyWelcomeBonus } from "../config/rewards";
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
        const welcomeBonus = REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.enabled
          ? `${REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.amount} free premium searches`
          : "exclusive benefits";
        
        res.status(200).json({
          inviteCode: user.inviteCode,
          shareMessage: `Join our app and get ${welcomeBonus}! Use my invite code: ${user.inviteCode}. Plus, I earn 20% commission when you subscribe!`,
          commissionInfo: {
            rate: REFERRAL_CONFIG.COMMISSION_RATE,
            description: "You earn 20% from every subscription your referrals purchase",
          },
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

      const welcomeBonus = REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.enabled
        ? `${REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.amount} free premium searches`
        : "exclusive benefits";

      res.status(200).json({
        message: "Invite code generated successfully",
        data: {
          inviteCode: user.inviteCode,
          shareMessage: `Join our app and get ${welcomeBonus}! Use my invite code: ${user.inviteCode}. Plus, I earn 20% commission when you subscribe!`,
          commissionInfo: {
            rate: REFERRAL_CONFIG.COMMISSION_RATE,
            description: "You earn 20% from every subscription your referrals purchase",
          },
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

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

      const alreadyRedeemed = await InvitationRedemptionModel.findOne({
        inviteCode: normalizedCode,
        redeemedBy: user._id,
      });

      if (alreadyRedeemed) {
        res.status(400).json({ message: "You already redeemed this code" });
        return;
      }

      const inviter : IUser = await UserModel.findOne({ inviteCode: normalizedCode });
      if (!inviter) {
        res.status(404).json({ message: "Invalid invite code" });
        return;
      }

      if (inviter._id.toString() === user._id.toString()) {
        res.status(400).json({ 
          message: "You cannot use your own invite code" 
        });
        return;
      }

      if (user.invitedBy) {
        res.status(400).json({
          message: "You have already been invited by another user",
        });
        return;
      }

      let welcomeBonusAmount = 0;
      if (REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.enabled) {
        const bonusResult = applyWelcomeBonus(user.premiumCredits);
        user.premiumCredits = bonusResult.credits;
        welcomeBonusAmount = REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.amount;
      }

      user.invitedBy = inviter._id;
      await user.save();

      inviter.totalInvites += 1;
      await inviter.save();

      await InvitationRedemptionModel.create({
        inviteCode: normalizedCode,
        inviterId: inviter._id,
        redeemedBy: user._id,
        rewardGiven: {
          inviterReward: {
            type: "commission",
            amount: REFERRAL_CONFIG.COMMISSION_RATE,
          },
          inviteeReward: {
            type: REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.enabled ? "credits" : "none",
            amount: welcomeBonusAmount,
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
        welcomeBonus: REFERRAL_CONFIG.INVITEE_WELCOME_BONUS.enabled
          ? {
              type: "credits",
              amount: welcomeBonusAmount,
              creditsRemaining: user.premiumCredits,
            }
          : null,
        referralInfo: {
          message: `Your referrer will earn ${REFERRAL_CONFIG.COMMISSION_RATE * 100}% commission when you subscribe to any plan!`,
          commissionRate: REFERRAL_CONFIG.COMMISSION_RATE,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

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

      // Get total commissions earned
      const totalCommissionsEarned = await Commission.aggregate([
        {
          $match: {
            referrerId: user._id,
            status: "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$commissionAmount" },
          },
        },
      ]);

      const commissionsEarned = totalCommissionsEarned.length > 0 ? totalCommissionsEarned[0].total : 0;

      res.status(200).json({
        message: "Invitation statistics retrieved successfully",
        data: {
          inviteCode: user.inviteCode || null,
          totalInvites: user.totalInvites,
          premiumCredits: user.premiumCredits,
          premiumExpiresAt: user.premiumExpiresAt || null,
          wallet: {
            balance: user.wallet?.balance || 0,
            totalEarned: user.wallet?.totalEarned || 0,
            totalWithdrawn: user.wallet?.totalWithdrawn || 0,
            currency: user.wallet?.currency || "EUR",
          },
          commissionRate: REFERRAL_CONFIG.COMMISSION_RATE,
          recentInvites,
        },
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

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
