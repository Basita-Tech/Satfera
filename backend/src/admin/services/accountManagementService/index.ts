import { Types } from "mongoose";
import {
  User,
  Profile,
  Notification,
  UserPersonal,
  UserFamily,
  UserHealth,
  UserExpectations,
  ProfileView,
  ConnectionRequest,
  Match,
  UserEducation,
  UserProfession
} from "../../../models";
import { logger } from "../../../lib/common/logger";

const validateUserId = (userId: string) => {
  if (!userId) throw new Error("userId is required");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
  return new Types.ObjectId(userId);
};

export async function restoreDeletedAccount(
  adminId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    validateUserId(adminId);
    const userObjectId = validateUserId(userId);

    const admin = await User.findById(adminId).select("role");
    if (!admin || (admin as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const user = await User.findById(userObjectId).select("isDeleted email");
    if (!user) {
      throw new Error("User not found");
    }

    if (!(user as any).isDeleted) {
      throw new Error("NotDeleted: Account is not deleted");
    }

    await User.findByIdAndUpdate(userObjectId, {
      isDeleted: false,
      deletedAt: null,
      deletionReason: null,
      isActive: true,
      isVisible: true
    });

    try {
      await Notification.create({
        user: userObjectId,
        type: "system",
        title: "Account Restored",
        message:
          "Your account has been restored by the administrator. You can now access your account normally.",
        meta: {
          restoredAt: new Date(),
          restoredBy: adminId
        }
      });
    } catch (err: any) {
      logger.error("Failed to create restoration notification:", err.message);
    }

    logger.info(`Account restored by admin ${adminId}: ${userId}`);
    return {
      success: true,
      message: "Account restored successfully"
    };
  } catch (error: any) {
    logger.error("Error in restoreDeletedAccount:", error.message);
    throw error;
  }
}

export async function hardDeleteAccount(
  adminId: string,
  userId: string
): Promise<{ success: boolean; message: string; deletedRecords: any }> {
  try {
    validateUserId(adminId);
    const userObjectId = validateUserId(userId);

    const admin = await User.findById(adminId).select("role");
    if (!admin || (admin as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const user = await User.findById(userObjectId).select("email customId");
    if (!user) {
      throw new Error("User not found");
    }

    const deletedRecords: any = {};

    try {
      const profileResult = await Profile.deleteOne({ userId: userObjectId });
      deletedRecords.profile = profileResult.deletedCount || 0;

      const personalResult = await UserPersonal.deleteOne({
        userId: userObjectId
      });
      deletedRecords.personal = personalResult.deletedCount || 0;

      const familyResult = await UserFamily.deleteOne({
        userId: userObjectId
      });
      deletedRecords.family = familyResult.deletedCount || 0;

      const educationResult = await UserEducation.deleteMany({
        userId: userObjectId
      });
      deletedRecords.education = educationResult.deletedCount || 0;

      const professionResult = await UserProfession.deleteMany({
        userId: userObjectId
      });
      deletedRecords.profession = professionResult.deletedCount || 0;

      const healthResult = await UserHealth.deleteOne({
        userId: userObjectId
      });
      deletedRecords.health = healthResult.deletedCount || 0;

      const expectationsResult = await UserExpectations.deleteOne({
        userId: userObjectId
      });
      deletedRecords.expectations = expectationsResult.deletedCount || 0;

      const viewsResult1 = await ProfileView.deleteMany({
        viewerId: userObjectId
      });
      const viewsResult2 = await ProfileView.deleteMany({
        profileId: userObjectId
      });
      deletedRecords.profileViews =
        (viewsResult1.deletedCount || 0) + (viewsResult2.deletedCount || 0);

      const connectionResult1 = await ConnectionRequest.deleteMany({
        senderId: userObjectId
      });
      const connectionResult2 = await ConnectionRequest.deleteMany({
        receiverId: userObjectId
      });
      deletedRecords.connectionRequests =
        (connectionResult1.deletedCount || 0) +
        (connectionResult2.deletedCount || 0);

      const matchesResult = await Match.deleteMany({
        $or: [{ userId: userObjectId }, { candidateId: userObjectId }]
      });
      deletedRecords.matches = matchesResult.deletedCount || 0;

      const notificationsResult = await Notification.deleteMany({
        user: userObjectId
      });
      deletedRecords.notifications = notificationsResult.deletedCount || 0;

      const unblockResult = await User.updateMany(
        { blockedUsers: userObjectId },
        { $pull: { blockedUsers: userObjectId } }
      );
      deletedRecords.unblockedFrom = unblockResult.modifiedCount || 0;

      const unfavoriteResult = await Profile.updateMany(
        { favoriteProfiles: userObjectId },
        { $pull: { favoriteProfiles: userObjectId } }
      );
      deletedRecords.unfavoritedFrom = unfavoriteResult.modifiedCount || 0;

      const userResult = await User.deleteOne({ _id: userObjectId });
      deletedRecords.user = userResult.deletedCount || 0;

      logger.info(
        `Account hard deleted by admin ${adminId}: ${userId}, email: ${(user as any).email}`
      );
      return {
        success: true,
        message: `Account and all related data permanently deleted. Total records deleted: ${Object.values(
          deletedRecords
        ).reduce((sum: number, count: any) => sum + count, 0)}`,
        deletedRecords
      };
    } catch (deleteError: any) {
      logger.error("Error during hard delete operation:", deleteError.message);
      throw new Error(`Failed to delete all records: ${deleteError.message}`);
    }
  } catch (error: any) {
    logger.error("Error in hardDeleteAccount:", error.message);
    throw error;
  }
}

export async function getDeletedAccounts(
  adminId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  success: boolean;
  data: any[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  try {
    validateUserId(adminId);

    const admin = await User.findById(adminId).select("role");
    if (!admin || (admin as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const skip = (page - 1) * limit;

    const [deletedUsers, total] = await Promise.all([
      User.find({ isDeleted: true })
        .select(
          "email firstName lastName customId deletedAt deletionReason createdAt"
        )
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ isDeleted: true })
    ]);

    return {
      success: true,
      data: deletedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error: any) {
    logger.error("Error in getDeletedAccounts:", error.message);
    throw error;
  }
}

export async function deleteAccount(userId: string, deletionReason: string) {
  try {
    const userObjectId = validateUserId(userId);

    const user = await User.findById(userObjectId).select("isDeleted");

    if (!user) {
      throw new Error("User not found");
    }

    if ((user as any).isDeleted) {
      throw new Error("Account already deleted");
    }

    await User.findByIdAndUpdate(userObjectId, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
      deletionReason,
      isVisible: false
    });

    logger.info(`Account soft deleted: ${userId}`);

    return {
      success: true,
      message: "Account deleted successfully"
    };
  } catch (error: any) {
    logger.error("Error in deleteAccount:", error.message);
    throw error;
  }
}
