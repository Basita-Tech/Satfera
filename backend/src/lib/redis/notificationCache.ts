import { redisClient, safeRedisOperation } from ".";
import { logger } from "../common/logger";

export const LIST_TTL = 60;
export const COUNT_TTL = 30;

export function listCacheKey(userId: string, page: number, limit: number) {
  return `notifications:list:${userId}:p:${page}:l:${limit}`;
}

export function unreadCountCacheKey(userId: string) {
  return `notifications:unreadCount:${userId}`;
}

export async function invalidateNotificationCaches(userId: string) {
  const pattern = `notifications:list:${userId}:*`;
  try {
    await safeRedisOperation(async () => {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(keys);
    }, "Invalidate notification list cache");

    await safeRedisOperation(
      () => redisClient.del(unreadCountCacheKey(userId)),
      "Invalidate unread count cache"
    );
  } catch (err: any) {
    logger.warn("invalidateNotificationCaches error", err?.message || err);
  }
}

export default {
  listCacheKey,
  unreadCountCacheKey,
  invalidateNotificationCaches
};
