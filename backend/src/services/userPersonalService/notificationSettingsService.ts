import { Types } from "mongoose";
import { Profile } from "../../models";
import { logger } from "../../lib/common/logger";

const validateUserId = (userId: string) => {
  if (!userId) throw new Error("userId is required");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
  return new Types.ObjectId(userId);
};

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const userObjectId = validateUserId(userId);

    if (
      settings.emailNotifications === undefined &&
      settings.pushNotifications === undefined &&
      settings.smsNotifications === undefined
    ) {
      throw new Error("At least one notification setting must be provided");
    }

    const updateData: any = {};
    if (settings.emailNotifications !== undefined) {
      updateData["settings.emailNotifications"] = settings.emailNotifications;
    }
    if (settings.pushNotifications !== undefined) {
      updateData["settings.pushNotifications"] = settings.pushNotifications;
    }
    if (settings.smsNotifications !== undefined) {
      updateData["settings.smsNotifications"] = settings.smsNotifications;
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: userObjectId },
      { $set: updateData },
      { new: true, select: "settings" }
    );

    if (!profile) {
      throw new Error("Profile not found");
    }

    const updatedSettings: NotificationSettings = {
      emailNotifications: (profile as any).settings.emailNotifications,
      pushNotifications: (profile as any).settings.pushNotifications,
      smsNotifications: (profile as any).settings.smsNotifications
    };

    logger.info(`Notification settings updated for user: ${userId}`);
    return {
      success: true,
      message: "Notification settings updated successfully"
    };
  } catch (error: any) {
    logger.error("Error in updateNotificationSettings:", error.message);
    throw error;
  }
}

export async function getNotificationSettings(
  userId: string
): Promise<NotificationSettings> {
  try {
    const userObjectId = validateUserId(userId);

    const profile = await Profile.findOne({ userId: userObjectId }).select(
      "settings"
    );

    if (!profile) {
      throw new Error("Profile not found");
    }

    return {
      emailNotifications: (profile as any).settings.emailNotifications,
      pushNotifications: (profile as any).settings.pushNotifications,
      smsNotifications: (profile as any).settings.smsNotifications
    };
  } catch (error: any) {
    logger.error("Error in getNotificationSettings:", error.message);
    throw error;
  }
}
