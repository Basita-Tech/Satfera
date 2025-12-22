import mongoose from "mongoose";
import { redisClient, safeRedisOperation } from ".";
import { logger } from "../common/logger";
import { ScoreDetail } from "../../types";

interface CachedMatchData {
  scoreDetail: ScoreDetail;
  userData?: any;
}

const CACHE_TTL = {
  MATCH_SCORE: 3600,
  PROFILE_VIEW: 86400,
  USER_PROFILE: 86400
};

export function getMatchScoreCacheKey(
  seekerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): string {
  return `match_score:${seekerId.toString()}:${candidateId.toString()}`;
}

export function getProfileViewCacheKey(
  viewerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): string {
  return `profile_view:${viewerId.toString()}:${candidateId.toString()}`;
}

export function getUserProfileCacheKey(
  userId: mongoose.Types.ObjectId
): string {
  return `user_profile:${userId.toString()}`;
}

/**
 * Scan Redis keys matching a pattern using non-blocking SCAN command.
 * This is preferred over KEYS which blocks the server.
 */
export async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = 0;

  do {
    const result = await redisClient.scan(cursor, {
      MATCH: pattern,
      COUNT: 100
    });
    cursor = result.cursor;
    keys.push(...result.keys);
  } while (cursor !== 0);

  return keys;
}

/**
 * Delete keys in batches to avoid blocking Redis
 */
async function deleteKeysBatch(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  const BATCH_SIZE = 100;
  let deletedCount = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    await redisClient.del(batch);
    deletedCount += batch.length;
  }

  return deletedCount;
}

export async function getCachedMatchScore(
  seekerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<CachedMatchData | null> {
  const cacheKey = getMatchScoreCacheKey(seekerId, candidateId);
  const cached = await safeRedisOperation(
    () => redisClient.get(cacheKey),
    "Get cached match score"
  );

  if (cached) {
    try {
      const data = JSON.parse(cached);

      if (data.scoreDetail) {
        return data as CachedMatchData;
      } else {
        return { scoreDetail: data, userData: undefined };
      }
    } catch (error) {
      logger.warn(`Failed to parse cached match score for key ${cacheKey}`);
      return null;
    }
  }
  return null;
}

export async function setCachedMatchScore(
  seekerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId,
  scoreDetail: ScoreDetail,
  userData?: any
): Promise<void> {
  const cacheKey = getMatchScoreCacheKey(seekerId, candidateId);
  const cacheData: CachedMatchData = {
    scoreDetail,
    userData
  };
  await safeRedisOperation(
    () =>
      redisClient.setEx(
        cacheKey,
        CACHE_TTL.MATCH_SCORE,
        JSON.stringify(cacheData)
      ),
    "Set cached match score"
  );
}

export async function hasViewedInLast24Hours(
  viewerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<boolean> {
  const cacheKey = getProfileViewCacheKey(viewerId, candidateId);
  const cached = await safeRedisOperation(
    () => redisClient.exists(cacheKey),
    "Check profile view cache"
  );
  return cached === 1;
}

export async function markProfileViewed(
  viewerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<void> {
  const cacheKey = getProfileViewCacheKey(viewerId, candidateId);
  await safeRedisOperation(
    () => redisClient.setEx(cacheKey, CACHE_TTL.PROFILE_VIEW, "1"),
    "Mark profile viewed"
  );
}

export async function invalidateUserMatchScores(
  userId: mongoose.Types.ObjectId
): Promise<void> {
  const matchPattern = `match_score:*${userId.toString()}*`;
  const profilePattern = getUserProfileCacheKey(userId);

  await safeRedisOperation(async () => {
    const matchKeys = await scanKeys(matchPattern);
    const allKeys = [...matchKeys, profilePattern];

    if (allKeys.length > 0) {
      const deletedCount = await deleteKeysBatch(allKeys);
      logger.info(
        `Invalidated ${deletedCount} cache entries (${matchKeys.length} match scores + profile) for user ${userId.toString()}`
      );
    }
  }, "Invalidate user match scores and profile cache");
}

export async function invalidateProfileViewCache(
  viewerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<void> {
  const cacheKey = `profile_view:${viewerId.toString()}:${candidateId.toString()}`;
  await safeRedisOperation(
    () => redisClient.del(cacheKey),
    "Invalidate profile view cache"
  );
  logger.debug(`Invalidated profile view cache: ${cacheKey}`);
}

export async function clearAllMatchScoreCache(): Promise<void> {
  const pattern = "match_score:*";
  await safeRedisOperation(async () => {
    const keys = await scanKeys(pattern);
    if (keys.length > 0) {
      const deletedCount = await deleteKeysBatch(keys);
      logger.warn(`Cleared ${deletedCount} match score cache entries`);
    }
  }, "Clear all match score cache");
}

export async function getCachedUserProfile(
  userId: mongoose.Types.ObjectId
): Promise<any | null> {
  const cacheKey = getUserProfileCacheKey(userId);
  const cached = await safeRedisOperation(
    () => redisClient.get(cacheKey),
    "Get cached user profile"
  );

  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      logger.warn(`Failed to parse cached user profile for key ${cacheKey}`);
      return null;
    }
  }
  return null;
}

export async function setCachedUserProfile(
  userId: mongoose.Types.ObjectId,
  profileData: any
): Promise<void> {
  const cacheKey = getUserProfileCacheKey(userId);
  await safeRedisOperation(
    () =>
      redisClient.setEx(
        cacheKey,
        CACHE_TTL.USER_PROFILE,
        JSON.stringify(profileData)
      ),
    "Set cached user profile"
  );
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  matchScores: number;
  profileViews: number;
  userProfiles: number;
}> {
  const stats = { matchScores: 0, profileViews: 0, userProfiles: 0 };

  await safeRedisOperation(async () => {
    const matchScoreKeys = await scanKeys("match_score:*");
    const profileViewKeys = await scanKeys("profile_view:*");
    const userProfileKeys = await scanKeys("user_profile:*");

    stats.matchScores = matchScoreKeys.length;
    stats.profileViews = profileViewKeys.length;
    stats.userProfiles = userProfileKeys.length;
  }, "Get cache stats");

  return stats;
}
