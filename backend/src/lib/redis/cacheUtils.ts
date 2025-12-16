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
    const matchKeys = await redisClient.keys(matchPattern);
    const allKeys = [...matchKeys, profilePattern];

    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
      logger.info(
        `Invalidated ${matchKeys.length} match score cache entries and user profile cache for user ${userId.toString()}`
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
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.warn(`Cleared ${keys.length} match score cache entries`);
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
}> {
  const stats = { matchScores: 0, profileViews: 0 };

  await safeRedisOperation(async () => {
    const matchScoreKeys = await redisClient.keys("match_score:*");
    const profileViewKeys = await redisClient.keys("profile_view:*");
    stats.matchScores = matchScoreKeys.length;
    stats.profileViews = profileViewKeys.length;
  }, "Get cache stats");

  return stats;
}
