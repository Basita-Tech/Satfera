import { Request, Response, NextFunction } from "express";
import { isIPBlocked, shouldBlockIP, blockIP } from "../utils/securityAudit";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";

/**
 * IP Blocking Middleware
 * Automatically blocks IPs with excessive suspicious activity
 */
export const ipBlockingMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ip = getClientIp(req);

    if (req.path === "/health" || req.path === "/") {
      return next();
    }

    const blocked = await isIPBlocked(ip);
    if (blocked) {
      logger.warn("Blocked IP attempted access", {
        ip,
        path: req.path,
        method: req.method,
        userAgent: req.get("user-agent")
      });

      return res.status(403).json({
        success: false,
        message:
          "Access denied. Your IP has been temporarily blocked due to suspicious activity."
      });
    }

    const shouldBlock = await shouldBlockIP(ip);
    if (shouldBlock) {
      await blockIP(ip, 3600, "Excessive suspicious activity");

      logger.warn("IP automatically blocked", {
        ip,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        message:
          "Access denied. Your IP has been blocked due to suspicious activity."
      });
    }

    next();
  } catch (error) {
    logger.error("Error in IP blocking middleware", error);

    next();
  }
};
