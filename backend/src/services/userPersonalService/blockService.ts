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
