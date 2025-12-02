import rateLimit from "express-rate-limit";
import { APP_CONFIG } from "../utils/constants";
import { logger } from "../lib/common/logger";
import { logSecurityEvent, SecurityEventType } from "../utils/securityAudit";
import { Request } from "express";
import { getClientIp } from "../utils/ipUtils";

const rateLimitHandler = (type: string) => {
  return async (req: Request, res: any) => {
    const identifier = getClientIp(req);

    await logSecurityEvent({
      type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
      ip: getClientIp(req),
      userAgent: req.get("user-agent"),
      details: {
        endpoint: req.path,
        type,
        message: "Rate limit exceeded"
      },
      timestamp: new Date(),
      severity: "medium"
    });

    logger.warn("Rate limit exceeded", {
      ip: getClientIp(req),
      path: req.path,
      type,
      userAgent: req.get("user-agent")
    });

    res.status(429).json({
      success: false,
      message:
        APP_CONFIG.RATE_LIMIT[
          type.toUpperCase() as keyof typeof APP_CONFIG.RATE_LIMIT
        ]?.MESSAGE || "Too many requests"
    });
  };
};

export const authLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.AUTH.WINDOW_MS,
  max: APP_CONFIG.RATE_LIMIT.AUTH.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: rateLimitHandler("AUTH"),
  skip: (req) => {
    return req.path === "/health";
  },
  keyGenerator: (req) => {
    return `${getClientIp(req)}_${req.get("user-agent") || "unknown"}`;
  }
});

export const otpLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.OTP.WINDOW_MS,
  max: APP_CONFIG.RATE_LIMIT.OTP.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("OTP"),
  keyGenerator: (req) => {
    const identifier =
      req.body.email || req.body.phoneNumber || getClientIp(req);
    return `otp_${identifier}`;
  }
});

export const apiLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.API.WINDOW_MS,
  max: APP_CONFIG.RATE_LIMIT.API.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("API"),
  skip: (req) => {
    return req.path === "/health" || req.path === "/";
  },
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    if (userId) {
      return `api_user_${userId}`;
    }
    return `api_ip_${getClientIp(req)}`;
  }
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    await logSecurityEvent({
      type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
      ip: getClientIp(req),
      userAgent: req.get("user-agent"),
      details: {
        endpoint: req.path,
        type: "PASSWORD_RESET",
        message: "Password reset rate limit exceeded"
      },
      timestamp: new Date(),
      severity: "high"
    });

    res.status(429).json({
      success: false,
      message: "Too many password reset requests. Please try again later."
    });
  }
});

export const photoUploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("PHOTO_UPLOAD"),
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      return `photo_ip_${getClientIp(req)}`;
    }
    return `photo_user_${userId}`;
  }
});
