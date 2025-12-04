import mongoose from "mongoose";
import { redisClient, safeRedisOperation } from ".";
import { logger } from "../common/logger";
import { ScoreDetail } from "../../types";

const CACHE_TTL = {
  MATCH_SCORE: 3600,
  PROFILE_VIEW: 86400
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

export async function getCachedMatchScore(
  seekerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<ScoreDetail | null> {
  const cacheKey = getMatchScoreCacheKey(seekerId, candidateId);
  const cached = await safeRedisOperation(
    () => redisClient.get(cacheKey),
    "Get cached match score"
  );

  if (cached) {
    try {
      return JSON.parse(cached);
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
  scoreDetail: ScoreDetail
): Promise<void> {
  const cacheKey = getMatchScoreCacheKey(seekerId, candidateId);
  await safeRedisOperation(
    () =>
      redisClient.setEx(
        cacheKey,
        CACHE_TTL.MATCH_SCORE,
        JSON.stringify(scoreDetail)
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

export async function invalidateMatchScoreCache(
  seekerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<void> {
  const cacheKey = `match_score:${seekerId.toString()}:${candidateId.toString()}`;
  await safeRedisOperation(
    () => redisClient.del(cacheKey),
    "Invalidate match score cache"
  );
  logger.debug(`Invalidated match score cache: ${cacheKey}`);
}

export async function invalidateUserMatchScores(
  userId: mongoose.Types.ObjectId
): Promise<void> {
  const pattern = `match_score:*${userId.toString()}*`;
  await safeRedisOperation(async () => {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(
        `Invalidated ${
          keys.length
        } match score cache entries for user ${userId.toString()}`
      );
    }
  }, "Invalidate user match scores");
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
