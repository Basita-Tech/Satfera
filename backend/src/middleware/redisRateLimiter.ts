import { Request, Response, NextFunction, RequestHandler } from "express";
import { redisClient, safeRedisOperation } from "../lib/redis";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyPrefix?: string;
    keyGenerator?: (req: Request) => string;
    handler?: (req: Request, res: Response) => void;
    skip?: (req: Request) => boolean;
}

export function createRedisRateLimiter(config: RateLimitConfig) {
    const {
        windowMs,
        maxRequests,
        keyPrefix = "rl",
        keyGenerator = (req) => getClientIp(req),
        handler = (req, res) =>
            res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later."
            }),
        skip = () => false
    } = config;

    return (async (req: Request, res: Response, next: NextFunction) => {
        if (skip(req)) return next();

        const identifier = keyGenerator(req);
        const key = `${keyPrefix}:${identifier}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        try {
            const result = await safeRedisOperation(async () => {
                await redisClient.zRemRangeByScore(key, 0, windowStart);

                const count = await redisClient.zCard(key);

                if (count >= maxRequests) {
                    const oldest = await redisClient.zRange(key, 0, 0);
                    const resetAt = oldest.length > 0 ? parseInt(oldest[0].split(":")[0]) + windowMs : now + windowMs;
                    return { allowed: false, remaining: 0, resetAt, count };
                }

                const member = `${now}:${Math.random().toString(36).substring(7)}`;
                await redisClient.zAdd(key, { score: now, value: member });
                await redisClient.expire(key, Math.ceil(windowMs / 1000));

                return {
                    allowed: true,
                    remaining: maxRequests - count - 1,
                    resetAt: now + windowMs,
                    count: count + 1
                };
            }, "Rate limit check");

            if (!result) {
                logger.warn("Rate limiter: Redis unavailable, allowing request");
                return next();
            }

            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, result.remaining));
            res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));
            res.setHeader("X-RateLimit-Policy", `${maxRequests};w=${Math.ceil(windowMs / 1000)}`);

            if (!result.allowed) {
                logger.warn("Rate limit exceeded", {
                    ip: getClientIp(req),
                    path: req.path,
                    method: req.method,
                    keyPrefix,
                    count: result.count,
                    maxRequests
                });

                return handler(req, res);
            }

            next();
        } catch (error) {
            logger.error("Rate limiter error:", error);
            next();
        }
    }) as RequestHandler;
}

/**
 * API Gateway rate limiter - general API protection
 * 100 requests per minute per user/IP
 */
export const apiGatewayLimiter = createRedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: "rl:api",
    keyGenerator: (req) => {
        const userId = (req as any).user?.id;
        return userId || getClientIp(req);
    },
    skip: (req) => {
        return req.path === "/health" || req.path === "/";
    }
});

/**
 * Authentication rate limiter - stricter limits for auth endpoints
 * 10 attempts per 15 minutes per IP + user-agent
 */
export const authGatewayLimiter = createRedisRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: "rl:auth",
    keyGenerator: (req) => {
        const ip = getClientIp(req);
        const ua = req.get("user-agent") || "unknown";
        return `${ip}:${ua.substring(0, 50)}`;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many authentication attempts. Please try again in 15 minutes."
        });
    }
});

/**
 * OTP rate limiter - very strict for OTP endpoints
 * 5 attempts per 10 minutes per identifier
 */
export const otpGatewayLimiter = createRedisRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 5,
    keyPrefix: "rl:otp",
    keyGenerator: (req) => {
        const identifier = req.body?.email || req.body?.phoneNumber || getClientIp(req);
        return identifier;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many OTP requests. Please try again in 10 minutes."
        });
    }
});

/**
 * Photo upload rate limiter
 * 30 uploads per minute per user
 */
export const photoUploadGatewayLimiter = createRedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: "rl:photo",
    keyGenerator: (req) => {
        const userId = (req as any).user?.id;
        return userId || getClientIp(req);
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many upload attempts. Please wait before uploading more."
        });
    }
});

/**
 * Search/Matching rate limiter - prevents expensive query abuse
 * 30 requests per minute per user
 */
export const searchGatewayLimiter = createRedisRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: "rl:search",
    keyGenerator: (req) => {
        const userId = (req as any).user?.id;
        return userId || getClientIp(req);
    }
});
