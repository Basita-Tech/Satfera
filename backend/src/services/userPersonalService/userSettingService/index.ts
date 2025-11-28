import { Types } from "mongoose";
import { User, Profile, Notification } from "../../../models";
import { logger } from "../../../lib/common/logger";
import {
  sendAccountActivationEmail,
  sendAccountDeactivationEmail,
  sendAccountDeletionEmail,
  sendOtpEmail
} from "../../../lib/emails";
import { APP_CONFIG } from "../../../utils/constants";
import { NotificationSettings } from "../../../types";
import { generateOtp, redisClient, safeRedisOperation } from "../../../lib";
import bcrypt from "bcryptjs";
import {
  clearOtpData,
  getOtp,
  getResendCount,
  incrementAttempt,
  incrementResend,
  OTP_ATTEMPT_LIMIT,
  OTP_RESEND_LIMIT,
  setOtp
} from "../../../lib/redis/otpRedis";

const ACCOUNT_STATUS_COOLDOWN_TTL = APP_CONFIG.ACCOUNT_STATUS_COOLDOWN_TTL;

export const validateUserId = (userId: string) => {
  if (!userId) throw new Error("userId is required");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
  return new Types.ObjectId(userId);
};

function cooldownKey(userId: string, targetId: string) {
  return `cooldown:block:${userId}:${targetId}`;
}

export async function blockUser(
  blockerId: string,
  targetCustomId: string
): Promise<{ success: true; blocked: { name: string; customId: string } }> {
  const blockerObjectId = validateUserId(blockerId);

  const target = await User.findOne({ customId: targetCustomId }).select(
    "_id firstName lastName customId"
  );
  if (!target) throw new Error("Target user not found");

  if (String(target._id) === String(blockerObjectId)) {
    throw new Error("Cannot block yourself");
  }

  const already = await User.findOne({
    _id: blockerObjectId,
    blockedUsers: target._id
  }).lean();
  if (already) {
    throw new Error("AlreadyBlocked: The user is already in your blocked list");
  }

  try {
    const key = cooldownKey(blockerId, String(target._id));
    const exists = await safeRedisOperation(
      () => redisClient.exists(key),
      "Check block cooldown"
    );
    if (exists && exists === 1) {
      throw new Error(
        "Cooldown: You can change block status for this profile once every 24 hours"
      );
    }
  } catch (err) {
    if (
      (err as any)?.message &&
      String((err as any).message).startsWith("Cooldown")
    ) {
      throw err;
    }
  }

  await User.findByIdAndUpdate(blockerObjectId, {
    $addToSet: { blockedUsers: target._id }
  });

  try {
    const key = cooldownKey(blockerId, String(target._id));
    await safeRedisOperation(
      () => redisClient.setEx(key, ACCOUNT_STATUS_COOLDOWN_TTL, "1"),
      "Set block cooldown"
    );
  } catch (e) {
    logger.warn("Failed to set block cooldown key", e);
  }

  const name =
    `${(target as any).firstName || ""} ${(target as any).lastName || ""}`.trim();

  return {
    success: true,
    blocked: { name: name || "", customId: (target as any).customId }
  };
}

export async function unblockUser(blockerId: string, targetCustomId: string) {
  const blockerObjectId = validateUserId(blockerId);

  const target = await User.findOne({ customId: targetCustomId }).select(
    "_id firstName lastName customId"
  );
  if (!target) throw new Error("Target user not found");

  const isBlocked = await User.findOne({
    _id: blockerObjectId,
    blockedUsers: target._id
  }).lean();
  if (!isBlocked) {
    throw new Error("NotBlocked: The user is not in your blocked list");
  }

  try {
    const key = cooldownKey(blockerId, String(target._id));
    const exists = await safeRedisOperation(
      () => redisClient.exists(key),
      "Check unblock cooldown"
    );
    if (exists && exists === 1) {
      throw new Error(
        "Cooldown: You can change block status for this profile once every 24 hours"
      );
    }
  } catch (err) {
    if (
      (err as any)?.message &&
      String((err as any).message).startsWith("Cooldown")
    ) {
      throw err;
    }
  }

  await User.findByIdAndUpdate(blockerObjectId, {
    $pull: { blockedUsers: target._id }
  });

  try {
    const key = cooldownKey(blockerId, String(target._id));
    await safeRedisOperation(
      () => redisClient.setEx(key, ACCOUNT_STATUS_COOLDOWN_TTL, "1"),
      "Set unblock cooldown"
    );
  } catch (e) {
    logger.warn("Failed to set unblock cooldown key", e);
  }

  return { success: true, unblocked: { customId: (target as any).customId } };
}

export async function getBlockedUsers(blockerId: string) {
  const blockerObjectId = validateUserId(blockerId);
  const user = await User.findById(blockerObjectId)
    .select("blockedUsers")
    .populate({ path: "blockedUsers", select: "firstName lastName customId" })
    .lean();

  const blocked = (user as any)?.blockedUsers || [];
  const mapped = blocked.map((b: any) => ({
    name: `${b.firstName || ""} ${b.lastName || ""}`.trim(),
    customId: b.customId
  }));

  return mapped;
}

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

function accountStatusCooldownKey(userId: string): string {
  return `cooldown:account-status:${userId}`;
}

export async function deactivateAccount(
  userId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userObjectId = validateUserId(userId);

    const user = await User.findById(userObjectId).select(
      "isActive isDeleted email firstName lastName"
    );
    if (!user) {
      throw new Error("User not found");
    }

    if ((user as any).isDeleted) {
      throw new Error("Cannot deactivate a deleted account");
    }

    if (!(user as any).isActive) {
      throw new Error("AlreadyDeactivated: Account is already deactivated");
    }

    const cooldownKey = accountStatusCooldownKey(userId);
    try {
      const exists = await redisClient.exists(cooldownKey);
      if (exists === 1) {
        throw new Error(
          "Cooldown: You can change account status once every 24 hours"
        );
      }
    } catch (err: any) {
      logger.error("Redis cooldown check failed (deactivate):", err.message);
    }

    await User.findByIdAndUpdate(userObjectId, {
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: reason || "User requested deactivation"
    });

    try {
      await redisClient.setEx(cooldownKey, ACCOUNT_STATUS_COOLDOWN_TTL, "1");
    } catch (err: any) {
      logger.error("Failed to set Redis cooldown (deactivate):", err.message);
    }

    try {
      const userName = `${(user as any).firstName} ${(user as any).lastName}`;
      await sendAccountDeactivationEmail((user as any).email, userName);
    } catch (err: any) {
      logger.error("Failed to send deactivation email:", err.message);
    }

    logger.info(`Account deactivated: ${userId}`);
    return {
      success: true,
      message:
        "Account deactivated successfully. You can reactivate after 24 hours."
    };
  } catch (error: any) {
    logger.error("Error in deactivateAccount:", error.message);
    throw error;
  }
}

export async function activateAccount(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userObjectId = validateUserId(userId);

    const user = await User.findById(userObjectId).select(
      "isActive isDeleted deactivatedAt email firstName lastName"
    );
    if (!user) {
      throw new Error("User not found");
    }

    if ((user as any).isDeleted) {
      throw new Error("Cannot activate a deleted account");
    }

    if ((user as any).isActive) {
      throw new Error("AlreadyActive: Account is already active");
    }

    const cooldownKey = accountStatusCooldownKey(userId);
    try {
      const exists = await redisClient.exists(cooldownKey);
      if (exists === 1) {
        const ttl = await redisClient.ttl(cooldownKey);
        const hoursLeft = Math.ceil(ttl / 3600);
        throw new Error(
          `Cooldown: You can activate your account in ${hoursLeft} hours. Please wait 24 hours after deactivation.`
        );
      }
    } catch (err: any) {
      if (err.message.startsWith("Cooldown:")) {
        throw err;
      }
      logger.error("Redis cooldown check failed (activate):", err.message);
    }

    await User.findByIdAndUpdate(userObjectId, {
      isActive: true,
      deactivatedAt: null,
      deactivationReason: null
    });

    try {
      await redisClient.setEx(cooldownKey, ACCOUNT_STATUS_COOLDOWN_TTL, "1");
    } catch (err: any) {
      logger.error("Failed to set Redis cooldown (activate):", err.message);
    }

    try {
      const userName = `${(user as any).firstName} ${(user as any).lastName}`;
      await sendAccountActivationEmail((user as any).email, userName);
    } catch (err: any) {
      logger.error("Failed to send activation email:", err.message);
    }

    logger.info(`Account activated: ${userId}`);
    return {
      success: true,
      message: "Account activated successfully"
    };
  } catch (error: any) {
    logger.error("Error in activateAccount:", error.message);
    throw error;
  }
}

export async function getAccountStatus(userId: string): Promise<{
  isActive: boolean;
  isDeleted: boolean;
  deactivatedAt?: Date;
  deactivationReason?: string;
  canChangeStatus: boolean;
  cooldownHoursRemaining?: number;
}> {
  try {
    const userObjectId = validateUserId(userId);

    const user = await User.findById(userObjectId).select(
      "isActive isDeleted deactivatedAt deactivationReason"
    );
    if (!user) {
      throw new Error("User not found");
    }

    let canChangeStatus = true;
    let cooldownHoursRemaining: number | undefined;

    const cooldownKey = accountStatusCooldownKey(userId);
    try {
      const exists = await redisClient.exists(cooldownKey);
      if (exists === 1) {
        const ttl = await redisClient.ttl(cooldownKey);
        cooldownHoursRemaining = Math.ceil(ttl / 3600);
        canChangeStatus = false;
      }
    } catch (err: any) {
      logger.error("Redis cooldown check failed (status):", err.message);
    }

    return {
      isActive: (user as any).isActive,
      isDeleted: (user as any).isDeleted,
      deactivatedAt: (user as any).deactivatedAt,
      deactivationReason: (user as any).deactivationReason,
      canChangeStatus,
      ...(cooldownHoursRemaining !== undefined && { cooldownHoursRemaining })
    };
  } catch (error: any) {
    logger.error("Error in getAccountStatus:", error.message);
    throw error;
  }
}

export async function changeUserPasswordService(
  userId: string,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  if (!userId) {
    return {
      success: false,
      message: "Authentication required"
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      message: "New password and confirm password do not match"
    };
  }

  if (oldPassword === newPassword) {
    return {
      success: false,
      message: "New password must be different from old password"
    };
  }

  try {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return {
        success: false,
        message: "User not found"
      };
    }

    if (!oldPassword) {
      return {
        success: false,
        message: "Old password is required"
      };
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return {
        success: false,
        message: "Old password is incorrect"
      };
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
    return {
      success: true,
      message: "Password changed successfully"
    };
  } catch (error: any) {
    logger.error("Error changing user password:", {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      message: "Failed to change password"
    };
  }
}

export async function requestEmailChange(
  userId: string,
  newEmail: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!newEmail || typeof newEmail !== "string") {
      throw new Error("New email is required");
    }

    const userObjectId = validateUserId(userId);
    const normalizedEmail = newEmail.toLowerCase().trim();

    if (
      !normalizedEmail ||
      normalizedEmail === "@" ||
      !normalizedEmail.includes("@")
    ) {
      throw new Error("Invalid email format");
    }

    const [user, existingUser, resendCount] = await Promise.all([
      User.findById(userObjectId).select("email").lean(),
      User.findOne({
        email: normalizedEmail,
        isDeleted: false,
        _id: { $ne: userObjectId }
      }).lean(),
      getResendCount(normalizedEmail, "signup")
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    if ((user as any).email === normalizedEmail) {
      throw new Error("New email must be different from current email");
    }

    if (existingUser) {
      throw new Error("Email already in use by another account");
    }

    if (resendCount >= OTP_RESEND_LIMIT) {
      throw new Error(
        "Resend OTP limit reached for today. Try again tomorrow."
      );
    }

    const otp = generateOtp(6);

    await Promise.all([
      incrementResend(normalizedEmail, "signup"),
      setOtp(normalizedEmail, otp, "signup")
    ]);

    sendOtpEmail(normalizedEmail, otp, "signup").catch((err) => {
      logger.error("Failed to send OTP email:", err.message);
    });

    logger.info(
      `Email change OTP sent to ${normalizedEmail} for user ${userId}`
    );

    return {
      success: true,
      message: "OTP sent to new email address. Valid for 5 minutes."
    };
  } catch (error: any) {
    logger.error("Error in requestEmailChange:", error.message);
    throw error;
  }
}

export async function verifyAndChangeEmail(
  userId: string,
  newEmail: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!newEmail || typeof newEmail !== "string") {
      throw new Error("New email is required");
    }

    if (!otp || typeof otp !== "string") {
      throw new Error("OTP is required");
    }

    const userObjectId = validateUserId(userId);
    const normalizedEmail = newEmail.toLowerCase().trim();

    if (
      !normalizedEmail ||
      normalizedEmail === "@" ||
      !normalizedEmail.includes("@")
    ) {
      throw new Error("Invalid email format");
    }

    const [user, storedOtp, attemptCount] = await Promise.all([
      User.findById(userObjectId).select("email").lean(),
      getOtp(normalizedEmail, "signup"),
      incrementAttempt(normalizedEmail, "signup")
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    if (attemptCount > OTP_ATTEMPT_LIMIT) {
      throw new Error(
        `Maximum OTP verification attempts (${OTP_ATTEMPT_LIMIT}) reached. Please try again after 24 hours.`
      );
    }

    if (storedOtp && storedOtp !== otp) {
      const remainingAttempts = OTP_ATTEMPT_LIMIT - attemptCount;
      throw new Error(
        `Invalid OTP. You have ${remainingAttempts} attempt${
          remainingAttempts !== 1 ? "s" : ""
        } remaining.`
      );
    }

    if (!storedOtp) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      isDeleted: false,
      _id: { $ne: userObjectId }
    }).lean();

    if (existingUser) {
      throw new Error("Email already in use by another account");
    }

    await Promise.all([
      User.findByIdAndUpdate(userObjectId, {
        email: normalizedEmail,
        isEmailVerified: true
      }),
      clearOtpData(normalizedEmail, "signup")
    ]);

    logger.info(
      `Email changed successfully for user ${userId} to ${normalizedEmail}`
    );

    return {
      success: true,
      message: "Email changed successfully"
    };
  } catch (error: any) {
    logger.error("Error in verifyAndChangeEmail:", error);
    throw error;
  }
}

export async function requestPhoneChange(
  userId: string,
  newPhoneNumber: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!newPhoneNumber || typeof newPhoneNumber !== "string") {
      throw new Error("New phone number is required");
    }

    const userObjectId = validateUserId(userId);
    const normalizedPhone = newPhoneNumber.trim();

    if (!normalizedPhone) {
      throw new Error("Invalid phone number format");
    }

    const [user, existingUser] = await Promise.all([
      User.findById(userObjectId).select("phoneNumber").lean(),
      User.findOne({
        phoneNumber: normalizedPhone,
        isDeleted: false,
        _id: { $ne: userObjectId }
      }).lean()
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    if ((user as any).phoneNumber === normalizedPhone) {
      throw new Error(
        "New phone number must be different from current phone number"
      );
    }

    if (existingUser) {
      throw new Error("Phone number already in use by another account");
    }

    logger.info(
      `Phone change request initiated for user ${userId}. User should verify via Twilio SMS.`
    );

    return {
      success: true,
      message:
        "Please verify your new phone number using the SMS verification endpoint"
    };
  } catch (error: any) {
    logger.error("Error in requestPhoneChange:", error.message);
    throw error;
  }
}

export async function verifyAndChangePhone(
  userId: string,
  newPhoneNumber: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!newPhoneNumber || typeof newPhoneNumber !== "string") {
      throw new Error("New phone number is required");
    }

    const userObjectId = validateUserId(userId);
    const normalizedPhone = newPhoneNumber.trim();

    if (!normalizedPhone) {
      throw new Error("Invalid phone number format");
    }

    const [user, existingUser] = await Promise.all([
      User.findById(userObjectId).select("phoneNumber").lean(),
      User.findOne({
        phoneNumber: normalizedPhone,
        isDeleted: false,
        _id: { $ne: userObjectId }
      }).lean()
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    if (existingUser) {
      throw new Error("Phone number already in use by another account");
    }

    await User.findByIdAndUpdate(userObjectId, {
      phoneNumber: normalizedPhone,
      isPhoneVerified: true
    });

    logger.info(
      `Phone number changed successfully for user ${userId} to ${normalizedPhone}`
    );

    return {
      success: true,
      message: "Phone number changed successfully"
    };
  } catch (error: any) {
    logger.error("Error in verifyAndChangePhone:", error.message);
    throw error;
  }
}
