import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { AuthenticatedRequest, JWTPayload } from "../types";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";
import { SessionService } from "../services/sessionService";
import { redisClient, safeRedisOperation } from "../lib/redis";

const AUTH_CACHE_TTL = 300;

interface CachedAuthData {
  user: {
    id: string;
    email: string;
    role: string;
    phoneNumber?: string;
    isDeleted: boolean;
    isActive?: boolean;
  };
  jtiValid: boolean;
}

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("SERVER_CONFIG_ERROR: JWT_SECRET is not defined");
  }
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

const extractToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers?.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

  return tokenFromHeader || req.cookies?.token || null;
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.warn("Authentication failed - no token", {
        hasCookies: !!req.cookies,
        hasAuthHeader: !!req.headers?.authorization,
        ip: getClientIp(req)
      });
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    let decoded: JWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (tokenError) {
      logger.warn("Token verification failed", {
        error: (tokenError as Error)?.message,
        ip: getClientIp(req),
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: (tokenError as Error)?.message || "Invalid token"
      });
    }

    const userId = decoded.id;
    const jti = (decoded as any).jti as string | undefined;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized Access: Missing ID" });
    }

    const cacheKey = `auth:${userId}:${jti || "no-jti"}`;
    let cachedAuth: CachedAuthData | null = null;

    const cachedString = await safeRedisOperation(
      () => redisClient.get(cacheKey),
      "Get cached auth"
    );

    if (cachedString) {
      try {
        cachedAuth = JSON.parse(cachedString) as CachedAuthData;
      } catch (parseError) {
        logger.error("Failed to parse cached auth data", {
          cacheKey,
          error: (parseError as Error).message
        });

        await safeRedisOperation(
          () => redisClient.del(cacheKey),
          "Delete bad cache"
        );
      }
    }

    let user: any;
    let jtiValid = false;

    if (cachedAuth) {
      user = cachedAuth.user;
      jtiValid = cachedAuth.jtiValid;
    } else {
      if (jti) {
        const session = await SessionService.validateSession(userId, jti);
        jtiValid = !!session;

        if (!jtiValid) {
          logger.warn("Unauthorized Access: Invalid Session", {
            userId,
            jti,
            ip: getClientIp(req)
          });
          return res.status(401).json({
            success: false,
            message: "Session is invalid or expired, please log in again."
          });
        }

        SessionService.updateSessionActivity(String(session.id)).catch(
          (err) => {
            logger.warn(`Failed to update session activity: ${err.message}`);
          }
        );
      }

      user = await User.findById(userId)
        .select("email role phoneNumber isDeleted isActive firstName lastName")
        .lean();

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message:
            "Account has been deleted. Please contact support or create a new account."
        });
      }

      const dataToCache: CachedAuthData = { user, jtiValid };
      await safeRedisOperation(
        () =>
          redisClient.setEx(
            cacheKey,
            AUTH_CACHE_TTL,
            JSON.stringify(dataToCache)
          ),
        "Cache auth data"
      ).catch((err) => {
        logger.warn(`Failed to cache auth data: ${err.message}`);
      });
    }

    const emailFromToken = (decoded as any).email;
    const phoneFromToken = (decoded as any).phoneNumber;
    const userIdFromUser = String(user.id || decoded.id);

    req.user = {
      id: userIdFromUser,
      role: user.role || "user",
      email: emailFromToken || user.email,
      phoneNumber: phoneFromToken || user.phoneNumber,
      fullName: `${user.firstName}  ${user.lastName}`
    };

    return next();
  } catch (e: any) {
    logger.error("Critical Authentication error", {
      error: e?.message,
      stack: e?.stack,
      ip: getClientIp(req)
    });

    return res.status(500).json({
      success: false,
      message: "An internal authentication error occurred."
    });
  }
};

export default authenticate;
