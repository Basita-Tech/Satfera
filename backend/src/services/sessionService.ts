import { Request } from "express";
import { UserSession, IUserSession } from "../models/UserSession";
import { getDeviceInfo, formatDeviceInfo } from "../utils/deviceParser";
import { logger } from "../lib/common/logger";
import mongoose from "mongoose";

export class SessionService {
  /**
   * Find existing session for the same device
   */
  static async findExistingSession(
    userId: string,
    req: Request,
    ipAddress: string
  ): Promise<IUserSession | null> {
    try {
      const deviceInfo = getDeviceInfo(req);

      const session = await UserSession.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        ipAddress,
        "deviceInfo.browser": deviceInfo.browser,
        "deviceInfo.os": deviceInfo.os,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivityAt: -1 });

      return session;
    } catch (error) {
      logger.error("Error finding existing session", error);
      return null;
    }
  }

  /**
   * Create new session in database
   */
  static async createSession(
    userId: string,
    token: string,
    jti: string,
    req: Request,
    ipAddress: string,
    expiresInSeconds: number = 86400,
    fingerprint?: string
  ): Promise<IUserSession> {
    const deviceInfo = getDeviceInfo(req);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const session = await UserSession.create({
      userId: new mongoose.Types.ObjectId(userId),
      token,
      jti,
      fingerprint,
      deviceInfo,
      ipAddress,
      loginAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt,
      isActive: true
    });

    logger.info(
      `New session created for user ${userId} on ${formatDeviceInfo(deviceInfo)}`
    );

    return session;
  }

  /**
   * Update session last activity
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await UserSession.findByIdAndUpdate(sessionId, {
        lastActivityAt: new Date()
      });
    } catch (error) {
      logger.error("Error updating session activity", error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await UserSession.find({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        expiresAt: { $gt: new Date() }
      })
        .select("-token -jti -ipAddress -location.display")
        .sort({ lastActivityAt: -1 });

      return sessions.map((session) => ({
        sessionId: String(session._id),
        device: formatDeviceInfo(session.deviceInfo),
        browser: session.deviceInfo.browser,
        os: session.deviceInfo.os,
        deviceType: session.deviceInfo.device,
        ipAddress: session.ipAddress,
        location: session.location
          ? {
              city: session.location.city,
              country: session.location.country,
              display: [session.location.city, session.location.country]
                .filter(Boolean)
                .join(", ")
            }
          : null,
        loginAt: session.loginAt,
        lastActivityAt: session.lastActivityAt,
        isCurrent: false
      }));
    } catch (error) {
      logger.error("Error getting user sessions", error);
      return [];
    }
  }

  /**
   * Logout from specific session
   */
  static async logoutSession(
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    try {
      const result = await UserSession.deleteOne({
        _id: new mongoose.Types.ObjectId(sessionId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (result.deletedCount === 0) {
        return false;
      }

      logger.info(`Session ${sessionId} deleted for user ${userId}`);

      return true;
    } catch (error) {
      logger.error("Error deleting session", error);
      return false;
    }
  }

  /**
   * Logout from all sessions (e.g., on password change)
   */
  static async logoutAllSessions(userId: string): Promise<number> {
    try {
      const result = await UserSession.deleteMany({
        userId: new mongoose.Types.ObjectId(userId)
      });

      const count = result.deletedCount || 0;
      logger.info(`${count} sessions deleted for user ${userId}`);

      return count;
    } catch (error) {
      logger.error("Error logging out all sessions", error);
      return 0;
    }
  }

  /**
   * Validate session and get session info
   */
  static async validateSession(
    userId: string,
    jti: string
  ): Promise<IUserSession | null> {
    try {
      const session = await UserSession.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        jti,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      return session;
    } catch (error) {
      logger.error("Error validating session", error);
      return null;
    }
  }

  /**
   * Cleanup expired sessions (can be run as a cron job)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await UserSession.updateMany(
        {
          isActive: true,
          expiresAt: { $lt: new Date() }
        },
        {
          isActive: false,
          logoutAt: new Date()
        }
      );

      logger.info(`Cleaned up ${result.modifiedCount} expired sessions`);

      return result.modifiedCount || 0;
    } catch (error) {
      logger.error("Error cleaning up expired sessions", error);
      return 0;
    }
  }
}
