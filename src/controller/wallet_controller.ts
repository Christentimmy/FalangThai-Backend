import { Request, Response } from "express";
import User from "../models/user_model";
import Commission from "../models/commission_model";
import WithdrawalRequest from "../models/withdrawal_request_model";
import { REFERRAL_CONFIG } from "../config/rewards";
import { IUser } from "../types/user_type";

export const walletController = {
  getWallet: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const commissions = await Commission.find({
        referrerId: user._id,
        status: "paid",
      })
        .populate("referredUserId", "full_name avatar")
        .sort({ createdAt: -1 })
        .limit(20);

      const pendingWithdrawals = await WithdrawalRequest.find({
        userId: user._id,
        status: { $in: ["pending", "processing"] },
      }).sort({ createdAt: -1 });

      const response = await Promise.all([
        {
          balance: user.wallet?.balance || 0,
          currency: user.wallet?.currency || "EUR",
          totalEarned: user.wallet?.totalEarned || 0,
          totalWithdrawn: user.wallet?.totalWithdrawn || 0,
        },
        commissions.map((c) => ({
          id: c._id,
          amount: c.commissionAmount,
          subscriptionAmount: c.subscriptionAmount,
          planId: c.planId,
          referredUser: c.referredUserId,
          date: c.paidAt,
        })),
        pendingWithdrawals.map((w) => ({
          id: w._id,
          amount: w.amount,
          status: w.status,
          paymentMethod: w.paymentMethod,
          createdAt: w.createdAt,
        })),
      ]);

      res.status(200).json({
        data: {
          wallet: response[0],
          commissions: response[1],
          pendingWithdrawals: response[2],
          minWithdrawalAmount: REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT,
        },
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getCommissions: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const commissions = await Commission.find({
        referrerId: user._id,
      })
        .populate("referredUserId", "full_name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Commission.countDocuments({
        referrerId: user._id,
      });

      const response = await Promise.all([
        commissions.map((c) => ({
          id: c._id,
          amount: c.commissionAmount,
          subscriptionAmount: c.subscriptionAmount,
          planId: c.planId,
          status: c.status,
          referredUser: c.referredUserId,
          date: c.createdAt,
          paidAt: c.paidAt,
        })),
      ]);

      res.status(200).json({
        data: response[0],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updatePaymentInfo: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { paymentMethod, paymentDetails } = req.body;

      if (
        !paymentMethod ||
        !["bank_transfer", "paypal", "stripe"].includes(paymentMethod)
      ) {
        res.status(400).json({ message: "Invalid payment method" });
        return;
      }

      // Validate payment details based on method
      if (paymentMethod === "bank_transfer") {
        if (
          !paymentDetails.accountHolderName ||
          !paymentDetails.accountNumber
        ) {
          res.status(400).json({
            message:
              "Account holder name and account number are required for bank transfer",
          });
          return;
        }
      } else if (paymentMethod === "paypal") {
        if (!paymentDetails.email) {
          res.status(400).json({
            message: "PayPal email is required",
          });
          return;
        }
      }

      // Update user's payment info
      const updateData: any = {
        "paymentInfo.preferredMethod": paymentMethod,
      };

      if (paymentMethod === "bank_transfer") {
        updateData["paymentInfo.bankTransfer"] = {
          accountHolderName: paymentDetails.accountHolderName,
          accountNumber: paymentDetails.accountNumber,
          bankName: paymentDetails.bankName || "",
        };
      } else if (paymentMethod === "paypal") {
        updateData["paymentInfo.paypal"] = {
          email: paymentDetails.email,
        };
      }

      await User.findByIdAndUpdate(user._id, updateData);

      res.status(200).json({
        message: "Payment information updated successfully",
      });
    } catch (error) {
      console.error("Error updating payment info:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  requestWithdrawal: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { amount } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ message: "Invalid withdrawal amount" });
        return;
      }

      // Check minimum withdrawal amount
      if (amount < REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT) {
        res.status(400).json({
          message: `Minimum withdrawal amount is €${REFERRAL_CONFIG.MIN_WITHDRAWAL_AMOUNT}`,
        });
        return;
      }

      // Check if user has sufficient balance
      const currentBalance = user.wallet?.balance || 0;
      if (amount > currentBalance) {
        res.status(400).json({
          message: "Insufficient balance",
          available: currentBalance,
        });
        return;
      }

      // Check if user has payment info set up
      if (!user.paymentInfo?.preferredMethod) {
        res.status(400).json({
          message: "Please set up your payment information first",
        });
        return;
      }

      // Check for pending withdrawals
      const pendingWithdrawal = await WithdrawalRequest.findOne({
        userId: user._id,
        status: { $in: ["pending", "processing"] },
      });

      if (pendingWithdrawal) {
        res.status(400).json({
          message: "You already have a pending withdrawal request",
        });
        return;
      }

      // Get payment details
      let paymentDetails: any = {};
      if (user.paymentInfo.preferredMethod === "bank_transfer") {
        paymentDetails = user.paymentInfo.bankTransfer;
      } else if (user.paymentInfo.preferredMethod === "paypal") {
        paymentDetails = user.paymentInfo.paypal;
      } else if (user.paymentInfo.preferredMethod === "stripe") {
        paymentDetails = user.paymentInfo.stripe;
      }

      // Create withdrawal request
      const withdrawalRequest = await WithdrawalRequest.create({
        userId: user._id,
        amount,
        currency: user.wallet?.currency || "EUR",
        status: "pending",
        paymentMethod: user.paymentInfo.preferredMethod,
        paymentDetails,
      });

      // Deduct from user's balance (will be refunded if rejected)
      await User.findByIdAndUpdate(user._id, {
        $inc: {
          "wallet.balance": -amount,
        },
      });

      res.status(200).json({
        message: "Withdrawal request submitted successfully",
        withdrawalRequest: {
          id: withdrawalRequest._id,
          amount: withdrawalRequest.amount,
          status: withdrawalRequest.status,
          createdAt: withdrawalRequest.createdAt,
        },
      });
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getWithdrawals: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const withdrawals = await WithdrawalRequest.find({
        userId: user._id,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await WithdrawalRequest.countDocuments({
        userId: user._id,
      });

      const response = await Promise.all([
        withdrawals.map((w) => ({
          id: w._id,
          amount: w.amount,
          currency: w.currency,
          status: w.status,
          paymentMethod: w.paymentMethod,
          createdAt: w.createdAt,
          processedAt: w.processedAt,
          rejectionReason: w.rejectionReason,
        })),
      ]);

      res.status(200).json({
        data: response[0],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  cancelWithdrawal: async (req: Request, res: Response) => {
    try {
      const user: IUser = res.locals.user;
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const { id } = req.params;

      const withdrawal = await WithdrawalRequest.findOne({
        _id: id,
        userId: user._id,
      });

      if (!withdrawal) {
        res.status(404).json({ message: "Withdrawal request not found" });
        return;
      }

      if (withdrawal.status !== "pending") {
        res.status(400).json({
          message: "Can only cancel pending withdrawal requests",
        });
        return;
      }

      // Refund the amount back to wallet
      await User.findByIdAndUpdate(user._id, {
        $inc: {
          "wallet.balance": withdrawal.amount,
        },
      });

      // Update withdrawal status
      withdrawal.status = "cancelled";
      await withdrawal.save();

      res.status(200).json({
        message: "Withdrawal request cancelled successfully",
      });
    } catch (error) {
      console.error("Error cancelling withdrawal:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
