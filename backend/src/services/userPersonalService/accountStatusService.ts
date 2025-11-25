import { Types } from "mongoose";
import { User } from "../../models";
import { redisClient } from "../../lib/redis";
import { logger } from "../../lib/common/logger";

const ACCOUNT_STATUS_COOLDOWN_TTL = 24 * 3600;

function accountStatusCooldownKey(userId: string): string {
  return `cooldown:account-status:${userId}`;
}

const validateUserId = (userId: string) => {
  if (!userId) throw new Error("userId is required");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
  return new Types.ObjectId(userId);
};

export async function deactivateAccount(
  userId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userObjectId = validateUserId(userId);

    const user = await User.findById(userObjectId).select("isActive isDeleted");
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
      "isActive isDeleted deactivatedAt"
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
