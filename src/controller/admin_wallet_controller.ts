import { Request, Response } from "express";
import User from "../models/user_model";
import WithdrawalRequest from "../models/withdrawal_request_model";
import Commission from "../models/commission_model";
import { IUser } from "../types/user_type";

export const adminWalletController = {
  /**
   * Get all withdrawal requests (admin only)
   * GET /api/admin/withdrawals
   */
  getAllWithdrawals: async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      const withdrawals = await WithdrawalRequest.find(query)
        .populate("userId", "full_name email phone_number")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await WithdrawalRequest.countDocuments(query);

      res.status(200).json({
        withdrawals: withdrawals.map((w) => ({
          id: w._id,
          user: w.userId,
          amount: w.amount,
          currency: w.currency,
          status: w.status,
          paymentMethod: w.paymentMethod,
          paymentDetails: w.paymentDetails,
          createdAt: w.createdAt,
          processedAt: w.processedAt,
          processedBy: w.processedBy,
          rejectionReason: w.rejectionReason,
          transactionId: w.transactionId,
        })),
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

  /**
   * Approve withdrawal request (admin only)
   * POST /api/admin/withdrawals/:id/approve
   */
  approveWithdrawal: async (req: Request, res: Response) => {
    try {
      const admin: IUser = res.locals.user;
      const { id } = req.params;
      const { transactionId } = req.body;

      const withdrawal = await WithdrawalRequest.findById(id);
      if (!withdrawal) {
        res.status(404).json({ message: "Withdrawal request not found" });
        return;
      }

      if (withdrawal.status !== "pending") {
        res.status(400).json({
          message: "Can only approve pending withdrawal requests",
        });
        return;
      }

      // Update withdrawal status
      withdrawal.status = "completed";
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = admin._id;
      withdrawal.transactionId = transactionId;
      await withdrawal.save();

      // Update user's total withdrawn
      await User.findByIdAndUpdate(withdrawal.userId, {
        $inc: {
          "wallet.totalWithdrawn": withdrawal.amount,
        },
      });

      res.status(200).json({
        message: "Withdrawal approved successfully",
        withdrawal: {
          id: withdrawal._id,
          status: withdrawal.status,
          processedAt: withdrawal.processedAt,
        },
      });
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  /**
   * Reject withdrawal request (admin only)
   * POST /api/admin/withdrawals/:id/reject
   */
  rejectWithdrawal: async (req: Request, res: Response) => {
    try {
      const admin: IUser = res.locals.user;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({ message: "Rejection reason is required" });
        return;
      }

      const withdrawal = await WithdrawalRequest.findById(id);
      if (!withdrawal) {
        res.status(404).json({ message: "Withdrawal request not found" });
        return;
      }

      if (withdrawal.status !== "pending") {
        res.status(400).json({
          message: "Can only reject pending withdrawal requests",
        });
        return;
      }

      // Refund the amount back to user's wallet
      await User.findByIdAndUpdate(withdrawal.userId, {
        $inc: {
          "wallet.balance": withdrawal.amount,
        },
      });

      // Update withdrawal status
      withdrawal.status = "rejected";
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = admin._id;
      withdrawal.rejectionReason = reason;
      await withdrawal.save();

      res.status(200).json({
        message: "Withdrawal rejected successfully",
        withdrawal: {
          id: withdrawal._id,
          status: withdrawal.status,
          processedAt: withdrawal.processedAt,
        },
      });
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  /**
   * Get commission statistics (admin only)
   * GET /api/admin/commissions/stats
   */
  getCommissionStats: async (req: Request, res: Response) => {
    try {
      const totalCommissions = await Commission.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$commissionAmount" },
          },
        },
      ]);

      const topReferrers = await Commission.aggregate([
        {
          $match: { status: "paid" },
        },
        {
          $group: {
            _id: "$referrerId",
            totalEarned: { $sum: "$commissionAmount" },
            referralCount: { $sum: 1 },
          },
        },
        {
          $sort: { totalEarned: -1 },
        },
        {
          $limit: 10,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            userId: "$_id",
            fullName: "$user.full_name",
            email: "$user.email",
            totalEarned: 1,
            referralCount: 1,
          },
        },
      ]);

      res.status(200).json({
        totalCommissions,
        topReferrers,
      });
    } catch (error) {
      console.error("Error fetching commission stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
