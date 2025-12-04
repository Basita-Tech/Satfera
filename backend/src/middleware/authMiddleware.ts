import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";
import { AuthenticatedRequest, JWTPayload } from "../types";
import { logger } from "../lib/common/logger";
import { getClientIp } from "../utils/ipUtils";
import { SessionService } from "../services/sessionService";

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers?.authorization || "";
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader || req.cookies?.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const decoded = verifyToken(token);
      if (!decoded?.id) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized Access" });
      }

      const jti = (decoded as any).jti;
      if (jti) {
        const session = await SessionService.validateSession(decoded.id, jti);

        if (!session) {
          logger.warn("Unauthorized Access", {
            userId: decoded.id,
            jti,
            ip: getClientIp(req)
          });

          return res.status(401).json({
            success: false,
            message: "Session is invalid, please log in again."
          });
        }

        await SessionService.updateSessionActivity(String(session._id));
      }

      const user = await User.findById(decoded.id).select(
        "email role phoneNumber isDeleted isActive"
      );

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      if ((user as any).isDeleted) {
        return res.status(403).json({
          success: false,
          message:
            "Account has been deleted. Please contact support or create a new account."
        });
      }

      if (!(user as any).isActive) {
        return res.status(403).json({
          success: false,
          message: "Account has been deactivated. Please contact support."
        });
      }

      const emailFromToken = (decoded as any).email;
      const phoneFromToken = (decoded as any).phoneNumber;

      req.user = {
        id: String(user._id),
        role: (user as any).role || "user",
        email: emailFromToken || user.email,
        phoneNumber: phoneFromToken || (user as any).phoneNumber
      };
    } catch (error) {
      logger.warn("Authentication failed", {
        error: (error as any)?.message,
        ip: getClientIp(req),
        path: req.path
      });

      return res.status(401).json({
        success: false,
        message: (error as any)?.message || "Invalid token"
      });
    }

    return next();
  } catch (e: any) {
    logger.error("Authentication error", {
      error: e?.message,
      stack: e?.stack,
      ip: getClientIp(req)
    });

    return res
      .status(401)
      .json({ success: false, message: "Authentication failed" });
  }
};

export default authenticate;
