import { Request, Response, NextFunction } from "express";
import { redisClient } from "../lib/redis";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";

/**
 * Brute Force Protection with Redis-backed tracking
 * Implements account lockout and progressive delays
 */

interface BruteForceConfig {
  maxAttempts: number;
  lockoutDuration: number;
  windowDuration: number;
  progressiveDelay: boolean;
}

const DEFAULT_CONFIG: BruteForceConfig = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60,
  windowDuration: 15 * 60,
  progressiveDelay: true
};

/**
 * Generate a unique key for tracking login attempts
 */
const getAttemptKey = (identifier: string, type: string = "login"): string => {
  return `brute_force:${type}:${identifier}`;
};

const getLockoutKey = (identifier: string, type: string = "login"): string => {
  return `lockout:${type}:${identifier}`;
};

/**
 * Get the number of failed attempts
 */
const getAttemptCount = async (key: string): Promise<number> => {
  try {
    const count = await redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    logger.error("Error getting attempt count from Redis", error);
    return 0;
  }
};

/**
 * Increment failed attempt counter
 */
const incrementAttempts = async (
  key: string,
  windowDuration: number
): Promise<number> => {
  try {
    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.expire(key, windowDuration);
    }

    return count;
  } catch (error) {
    logger.error("Error incrementing attempts in Redis", error);
    return 0;
  }
};

/**
 * Check if account is locked out
 */
const isLockedOut = async (key: string): Promise<boolean> => {
  try {
    const lockout = await redisClient.get(key);
    return lockout !== null;
  } catch (error) {
    logger.error("Error checking lockout status from Redis", error);
    return false;
  }
};

/**
 * Lock out an account
 */
const lockoutAccount = async (
  key: string,
  duration: number,
  identifier: string
): Promise<void> => {
  try {
    await redisClient.setEx(key, duration, "locked");

    logger.warn("Account locked due to excessive failed attempts", {
      identifier,
      duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error setting lockout in Redis", error);
  }
};

/**
 * Reset attempt counter on successful login
 */
export const resetLoginAttempts = async (identifier: string): Promise<void> => {
  try {
    const attemptKey = getAttemptKey(identifier);
    const lockoutKey = getLockoutKey(identifier);

    await Promise.all([
      redisClient.del(attemptKey),
      redisClient.del(lockoutKey)
    ]);
  } catch (error) {
    logger.error("Error resetting login attempts", error);
  }
};

/**
 * Calculate progressive delay based on attempt count
 */
const calculateDelay = (attemptCount: number): number => {
  if (attemptCount <= 3) return 0;

  return Math.min(1000 * Math.pow(2, attemptCount - 4), 10000);
};

/**
 * Brute force protection middleware for login endpoints
 */
export const bruteForceProtection = (
  config: Partial<BruteForceConfig> = {}
) => {
  const finalConfig: BruteForceConfig = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = (
        req.body.email ||
        req.body.phoneNumber ||
        getClientIp(req)
      )
        ?.toString()
        .toLowerCase()
        .trim();

      if (!identifier) {
        return next();
      }

      const attemptKey = getAttemptKey(identifier);
      const lockoutKey = getLockoutKey(identifier);

      const locked = await isLockedOut(lockoutKey);
      if (locked) {
        const ttl = await redisClient.ttl(lockoutKey);
        const remainingMinutes = Math.ceil(ttl / 60);

        logger.warn("Login attempt on locked account", {
          identifier,
          ip: getClientIp(req),
          remainingMinutes
        });

        return res.status(429).json({
          success: false,
          message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`,
          lockedUntil: new Date(Date.now() + ttl * 1000).toISOString()
        });
      }

      const attemptCount = await getAttemptCount(attemptKey);

      if (finalConfig.progressiveDelay && attemptCount > 0) {
        const delay = calculateDelay(attemptCount);
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      (req as any).bruteForce = {
        attemptKey,
        lockoutKey,
        attemptCount,
        config: finalConfig,
        identifier
      };

      next();
    } catch (error) {
      logger.error("Error in brute force protection middleware", error);

      next();
    }
  };
};

/**
 * Record failed login attempt
 * Should be called after authentication fails
 */
export const recordFailedAttempt = async (req: Request): Promise<void> => {
  const bruteForce = (req as any).bruteForce;

  if (!bruteForce) return;

  try {
    const { attemptKey, lockoutKey, config, identifier } = bruteForce;

    const newCount = await incrementAttempts(attemptKey, config.windowDuration);

    logger.warn("Failed login attempt recorded", {
      identifier,
      attemptCount: newCount,
      maxAttempts: config.maxAttempts,
      ip: getClientIp(req),
      userAgent: req.get("user-agent")
    });

    if (newCount >= config.maxAttempts) {
      await lockoutAccount(lockoutKey, config.lockoutDuration, identifier);
    }
  } catch (error) {
    logger.error("Error recording failed attempt", error);
  }
};

/**
 * Account lockout middleware for specific user accounts
 * This is in addition to IP-based protection
 */
export const accountLockoutProtection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return next();
    }

    const lockoutKey = `account_lockout:${userId}`;
    const locked = await isLockedOut(lockoutKey);

    if (locked) {
      const ttl = await redisClient.ttl(lockoutKey);
      const remainingMinutes = Math.ceil(ttl / 60);

      logger.warn("Access attempt on locked account", {
        userId,
        ip: getClientIp(req),
        path: req.path
      });

      return res.status(403).json({
        success: false,
        message: `Your account has been temporarily locked. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""} or contact support.`
      });
    }

    next();
  } catch (error) {
    logger.error("Error in account lockout protection", error);
    next();
  }
};

/**
 * Lock a specific user account (for admin use or security events)
 */
export const lockUserAccount = async (
  userId: string,
  duration: number = 3600,
  reason: string = "Security policy"
): Promise<void> => {
  try {
    const lockoutKey = `account_lockout:${userId}`;
    await redisClient.setEx(lockoutKey, duration, reason);

    logger.warn("User account manually locked", {
      userId,
      duration,
      reason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error locking user account", error);
    throw error;
  }
};

/**
 * Unlock a user account
 */
export const unlockUserAccount = async (userId: string): Promise<void> => {
  try {
    const lockoutKey = `account_lockout:${userId}`;
    await redisClient.del(lockoutKey);

    logger.info("User account unlocked", {
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Error unlocking user account", error);
    throw error;
  }
};

/**
 * Get lockout status for a user
 */
export const getLockoutStatus = async (
  identifier: string
): Promise<{
  isLocked: boolean;
  remainingTime?: number;
  attemptCount?: number;
}> => {
  try {
    const lockoutKey = getLockoutKey(identifier);
    const attemptKey = getAttemptKey(identifier);

    const [locked, attemptCount] = await Promise.all([
      isLockedOut(lockoutKey),
      getAttemptCount(attemptKey)
    ]);

    if (locked) {
      const ttl = await redisClient.ttl(lockoutKey);
      return {
        isLocked: true,
        remainingTime: ttl,
        attemptCount
      };
    }

    return {
      isLocked: false,
      attemptCount
    };
  } catch (error) {
    logger.error("Error getting lockout status", error);
    return { isLocked: false };
  }
};
