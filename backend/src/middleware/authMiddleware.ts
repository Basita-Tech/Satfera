import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { AuthenticatedRequest, JWTPayload } from "../types";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";
import { SessionService } from "../services/sessionService";
import { redisClient, safeRedisOperation } from "../lib/redis";
import { Types } from "mongoose";

const AUTH_CACHE_TTL = 300;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("SERVER_CONFIG_ERROR: JWT_SECRET is not defined");
}

interface UserData {
  _id: string | Types.ObjectId;
  email: string;
  role: "admin" | "user" | string;
  phoneNumber?: string;
  isDeleted: boolean;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  planExpiry?: Date | string;
  accountType?: string;
  deactivatedAt?: Date;
}

interface CachedAuthData {
  user: UserData;
  jtiValid: boolean;
}

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

const extractToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return (authHeader as string) || req.cookies?.token || null;
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  try {
    const token = extractToken(req);
    if (!token) {
      if (req.headers.authorization) {
        logger.warn("Auth failed: Malformed token", { ip: getClientIp(req) });
      }
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    let decoded: JWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      logger.warn(
        `Auth failed: Invalid token error: ${err.message}, ip: ${getClientIp(req)}`
      );

      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const userId = decoded.id;
    const jti = (decoded as any).jti;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }

    const cacheKey = `auth:${userId}:${jti ?? "no-jti"}`;

    const cachedString = await safeRedisOperation(
      () => redisClient.get(cacheKey),
      "auth-cache-get"
    );

    let user: UserData | null = null;

    if (cachedString) {
      try {
        const cachedAuth: CachedAuthData = JSON.parse(cachedString);
        user = cachedAuth.user;
      } catch {
        redisClient.del(cacheKey).catch(() => {});
      }
    }

    if (!user) {
      const [sessionValid, fetchedUser] = await Promise.all([
        jti
          ? SessionService.validateSession(userId, jti)
          : Promise.resolve(true),
        User.findById(userId)
          .select(
            "email role phoneNumber isDeleted isActive firstName lastName planExpiry accountType"
          )
          .lean<UserData>()
      ]);

      if (!fetchedUser) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      if (fetchedUser.isDeleted) {
        return res.status(403).json({
          success: false,
          message: "Account deleted. Contact support."
        });
      }

      if (jti && !sessionValid) {
        logger.warn("Invalid session", { userId, jti });
        return res.status(401).json({
          success: false,
          message: "Session expired. Please log in again."
        });
      }

      if (jti) {
        const sessionId = (sessionValid as any).id || (sessionValid as any)._id;
        if (sessionId)
          SessionService.updateSessionActivity(String(sessionId)).catch(
            () => {}
          );
      }

      user = fetchedUser;

      safeRedisOperation(
        () =>
          redisClient.setEx(
            cacheKey,
            AUTH_CACHE_TTL,
            JSON.stringify({ user, jtiValid: true })
          ),
        "auth-cache-set"
      ).catch(() => {});
    }

    if (user.planExpiry && user.role !== "admin") {
      const expiryDate = new Date(user.planExpiry);
      const now = new Date();

      if (expiryDate < now) {
        if (user.isActive !== false) {
          await User.findByIdAndUpdate(userId, {
            isActive: false,
            deactivatedAt: now,
            deactivationReason: "plan_expired"
          });

          redisClient.del(cacheKey).catch(() => {});
        }

        return res.status(402).json({
          success: false,
          code: "PLAN_UPGRADE",
          message: "Account validity expired. Please upgrade."
        });
      }
    }

    req.user = {
      id: String(user._id),
      role: user?.role as any,
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : "User"
    };

    return next();
  } catch (err: any) {
    logger.error("Critical auth error", {
      error: err.message,
      stack: err.stack,
      ip: getClientIp(req)
    });

    return res
      .status(500)
      .json({ success: false, message: "Internal authentication error" });
  }
};

export default authenticate;
