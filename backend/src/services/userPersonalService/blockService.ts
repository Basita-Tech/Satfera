import { Types } from "mongoose";
import { User } from "../../models";
import { redisClient, safeRedisOperation } from "../../lib";
import { logger } from "../../lib/common/logger";

const BLOCK_COOLDOWN_TTL = 24 * 3600;

const validateUserId = (userId: string) => {
  if (!userId) throw new Error("userId is required");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
  return new Types.ObjectId(userId);
};

function cooldownKey(userId: string) {
  return `cooldown:block:${userId}`;
}

export async function blockUser(
  blockerId: string,
  targetCustomId: string
): Promise<{ success: true; blocked: { name: string; customId: string } }> {
  const blockerObjectId = validateUserId(blockerId);

  try {
    const key = cooldownKey(blockerId);
    const exists = await safeRedisOperation(
      () => redisClient.exists(key),
      "Check block cooldown"
    );
    if (exists && exists === 1) {
      throw new Error("Cooldown: action allowed once per 24 hours");
    }
  } catch (err) {
    if (
      (err as any)?.message &&
      String((err as any).message).startsWith("Cooldown")
    ) {
      throw err;
    }
  }

  const target = await User.findOne({ customId: targetCustomId }).select(
    "_id firstName lastName customId"
  );
  if (!target) throw new Error("Target user not found");

  if (String(target._id) === String(blockerObjectId)) {
    throw new Error("Cannot block yourself");
  }

  await User.findByIdAndUpdate(blockerObjectId, {
    $addToSet: { blockedUsers: target._id }
  });

  try {
    const key = cooldownKey(blockerId);
    await safeRedisOperation(
      () => redisClient.setEx(key, BLOCK_COOLDOWN_TTL, "1"),
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

  await User.findByIdAndUpdate(blockerObjectId, {
    $pull: { blockedUsers: target._id }
  });

  try {
    const key = cooldownKey(blockerId);
    await safeRedisOperation(
      () => redisClient.setEx(key, BLOCK_COOLDOWN_TTL, "1"),
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
