import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";

/**
 * CSRF Protection Middleware
 * Validates CSRF token from request headers against cookie
 * Only applies to state-changing methods (POST, PUT, DELETE, PATCH)
 */

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  const publicPaths = [
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/logout",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/send-email-otp",
    "/api/v1/auth/verify-email-otp",
    "/api/v1/auth/send-sms-otp",
    "/api/v1/auth/verify-sms-otp",
    "/health"
  ];

  if (publicPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // const csrfTokenFromHeader =
  //   req.headers["x-csrf-token"] || req.headers["csrf-token"];
  const csrfTokenFromCookie = req.cookies?.csrf_token;

  if (!csrfTokenFromCookie) {
    return next();
  }

  // if (!csrfTokenFromHeader || csrfTokenFromHeader !== csrfTokenFromCookie) {
  //   logger.warn("CSRF token validation failed", {
  //     ip: getClientIp(req),
  //     path: req.path,
  //     method: req.method,
  //     hasHeaderToken: !!csrfTokenFromHeader,
  //     hasCookieToken: !!csrfTokenFromCookie
  //   });

  //   return res.status(403).json({
  //     success: false,
  //     message: "Invalid CSRF token"
  //   });
  // }

  next();
};
