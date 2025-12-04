import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { logger } from "../lib/common/logger";

export function photoUploadSecurityHeaders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  res.setHeader("X-Frame-Options", "DENY");

  res.setHeader("X-XSS-Protection", "1; mode=block");

  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; script-src 'none'"
  );

  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  next();
}

export function fileUploadRateLimiter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  const rateLimitKey = `upload:${user.id}:${req.ip}`;

  logger.info(`File upload attempt by user ${user.id} from IP ${req.ip}`);

  next();
}

export function validateMultipartFormData(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.is("multipart/form-data")) {
    const contentType = req.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return res.status(415).json({
        success: false,
        message:
          "Invalid Content-Type. Use multipart/form-data for file uploads."
      });
    }
  }

  next();
}

export default {
  photoUploadSecurityHeaders,
  fileUploadRateLimiter,
  validateMultipartFormData
};
