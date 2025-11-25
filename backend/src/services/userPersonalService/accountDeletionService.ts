import { Types } from "mongoose";
import { User, Profile, Notification } from "../../models";
import { logger } from "../../lib/common/logger";
import { sendAccountDeletionEmail } from "../../lib/emails";

const validateUserId = (userId: string) => {
  if (!userId) throw new Error("userId is required");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
  return new Types.ObjectId(userId);
};

export async function deleteAccount(
  userId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userObjectId = validateUserId(userId);

    if (!reason || reason.trim().length < 10) {
      throw new Error("Deletion reason must be at least 10 characters");
    }
    if (reason.length > 500) {
      throw new Error("Deletion reason must not exceed 500 characters");
    }

    const user = await User.findById(userObjectId).select(
      "isDeleted email firstName lastName"
    );
    if (!user) {
      throw new Error("User not found");
    }

    if ((user as any).isDeleted) {
      throw new Error("AlreadyDeleted: Account is already deleted");
    }

    await User.findByIdAndUpdate(userObjectId, {
      isDeleted: true,
      deletedAt: new Date(),
      deletionReason: reason.trim(),
      isActive: false
    });

    await Profile.findOneAndUpdate(
      { userId: userObjectId },
      { isVisible: false }
    );

    try {
      await Notification.create({
        user: userObjectId,
        type: "system",
        title: "Account Deleted",
        message:
          "Your account has been deleted as per your request. You can sign up again anytime with your email or phone number.",
        meta: {
          deletedAt: new Date(),
          reason: reason.trim()
        }
      });
    } catch (err: any) {
      logger.error("Failed to create deletion notification:", err.message);
    }

    try {
      const userName = `${(user as any).firstName} ${(user as any).lastName}`;
      await sendAccountDeletionEmail((user as any).email, userName);
    } catch (err: any) {
      logger.error("Failed to send deletion confirmation email:", err.message);
    }

    logger.info(
      `Account soft deleted: ${userId}, reason: ${reason.substring(0, 50)}...`
    );
    return {
      success: true,
      message: "Account deleted successfully."
    };
  } catch (error: any) {
    logger.error("Error in deleteAccount:", error.message);
    throw error;
  }
}

export async function getAccountDeletionStatus(userId: string): Promise<{
  isDeleted: boolean;
  deletedAt?: Date;
  deletionReason?: string;
}> {
  try {
    const userObjectId = validateUserId(userId);

    const user = await User.findById(userObjectId).select(
      "isDeleted deletedAt deletionReason"
    );
    if (!user) {
      throw new Error("User not found");
    }

    return {
      isDeleted: (user as any).isDeleted,
      deletedAt: (user as any).deletedAt,
      deletionReason: (user as any).deletionReason
    };
  } catch (error: any) {
    logger.error("Error in getAccountDeletionStatus:", error.message);
    throw error;
  }
}
