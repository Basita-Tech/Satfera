import {
  Profile,
  User,
  UserPersonal,
  UserProfession,
  ConnectionRequest,
  Notification,
  ProfileView
} from "../../models";
import { Request, Response } from "express";
import { logger } from "../../lib/common/logger";
import { calculateAge } from "../../utils/utils";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import { AuthenticatedRequest } from "../../types";
import { formatListingProfile } from "../../lib";

export async function getUserDashboardController(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const [user, userPersonal, userProfile, userProfession, sentRequests] =
      await Promise.all([
        User.findById(userId, "firstName lastName dateOfBirth").lean(),
        UserPersonal.findOne({ userId }, "full_address.city").lean(),
        Profile.findOne(
          { userId },
          "photos.closerPhoto favoriteProfiles isVerified ProfileViewed accountType"
        ).lean(),
        UserProfession.findOne({ userId }, "Occupation").lean(),
        ConnectionRequest.countDocuments({ sender: userId, status: "pending" })
      ]);

    if (!user || !userProfile) {
      return res.status(404).json({
        success: false,
        message: "User or profile data not found"
      });
    }

    const profile = userProfile as any;
    const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

    const dashboardData = {
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      age: age,
      closerPhotoUrl: profile.photos?.closerPhoto?.url || null,
      city: userPersonal?.full_address?.city || null,
      occupation: userProfession?.Occupation || null,
      accountType: profile.accountType || "free",
      isVerified: profile.isVerified || false,
      interestSentCount: sentRequests || 0,
      profileViewsCount: profile.ProfileViewed || 0,
      shortListedCount: profile.favoriteProfiles?.length || 0
    };

    return res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    logger.error("Error fetching user dashboard:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data"
    });
  }
}

export async function changeUserPassword(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors
        .array()
        .map((e) => e.msg)
        .toString()
    });
  }

  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match"
    });
  }

  try {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!oldPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is required" });
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    try {
      await Notification.create({
        user: user._id,
        type: "system",
        title: "Your password has been changed",
        message:
          "If you did not perform this action, please contact support immediately.",
        isRead: false
      });
    } catch (notifyErr: any) {
      logger.warn(
        "Failed to create password change notification:",
        notifyErr.message
      );
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
      forceLogout: true
    });
  } catch (error: any) {
    logger.error("Error changing user password:", {
      error: error.message,
      stack: error.stack
    });
    return res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
}

export async function getUserProfileViewsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20)
    );
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $match: { candidate: new (require("mongoose").Types.ObjectId)(userId) }
      },
      { $sort: { viewedAt: -1 } },
      { $group: { _id: "$viewer", lastViewedAt: { $first: "$viewedAt" } } },
      { $sort: { lastViewedAt: -1 } },
      {
        $facet: {
          results: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }]
        }
      }
    ];

    const agg = await ProfileView.aggregate(pipeline).allowDiskUse(true).exec();
    const results = (agg[0] && agg[0].results) || [];
    const total =
      (agg[0] &&
        agg[0].totalCount &&
        agg[0].totalCount[0] &&
        agg[0].totalCount[0].count) ||
      0;

    const viewerIds = results.map((r: any) => String(r._id));

    const [users, personals, profiles, profileViewDoc] = await Promise.all([
      User.find(
        { _id: { $in: viewerIds } },
        "firstName lastName dateOfBirth createdAt customId"
      ).lean(),
      UserPersonal.find({ userId: { $in: viewerIds } }).lean(),
      Profile.find({ userId: { $in: viewerIds } }).lean(),
      Profile.findOne({ userId }).select("ProfileViewed").lean()
    ]);

    const userMap = new Map(users.map((u: any) => [String(u._id), u]));
    const personalMap = new Map(
      (personals || []).map((p: any) => [String(p.userId), p])
    );
    const profileMap = new Map(
      (profiles || []).map((p: any) => [String(p.userId), p])
    );

    const listings = results.map((r: any) => {
      const vid = String(r._id);
      const user = userMap.get(vid);
      if (!user) return null;
      const personal = personalMap.get(vid) || null;
      const profile = profileMap.get(vid) || null;

      return formatListingProfile(
        user,
        personal,
        profile,
        { score: 0, reasons: [] },
        null
      );
    });

    const validResults = (await Promise.all(listings)).filter(
      (x: any) => x !== null
    );

    return res.status(200).json({
      success: true,
      profileViewCount:
        (profileViewDoc && (profileViewDoc as any).ProfileViewed) || 0,
      data: validResults,
      pagination: {
        total,
        page,
        limit,
        hasMore: skip + validResults.length < total
      }
    });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to get profile views" });
  }
}

export * from "./blockController";
