import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import { SessionService } from "../services/sessionService";
import { logger } from "../lib/common/logger";

export class SessionController {
  static async getUserSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const decoded = req.user as any;
      const currentJti = decoded.jti;

      const sessions = await SessionService.getUserSessions(userId);

      const sessionsWithCurrent = sessions.map((session) => {
        const isCurrent =
          session.sessionId && currentJti
            ? session.sessionId.toString() === currentJti
            : false;

        return {
          ...session,
          isCurrent
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          sessions: sessionsWithCurrent,
          total: sessions.length
        }
      });
    } catch (error: any) {
      logger.error("Error fetching user sessions", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch sessions"
      });
    }
  }

  static async logoutSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required"
        });
      }

      const success = await SessionService.logoutSession(userId, sessionId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Session not found or already logged out"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Successfully logged out from device"
      });
    } catch (error: any) {
      logger.error("Error logging out session", error);
      return res.status(500).json({
        success: false,
        message: "Failed to logout from device"
      });
    }
  }

  static async logoutAllSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const decoded = req.user as any;
      const currentJti = decoded.jti;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }

      const sessions = await SessionService.getUserSessions(userId);

      let loggedOutCount = 0;
      for (const session of sessions) {
        const success = await SessionService.logoutSession(
          userId,
          session.sessionId
        );
        if (success) loggedOutCount++;
      }

      return res.status(200).json({
        success: true,
        message: `Successfully logged out from ${loggedOutCount} device(s)`,
        data: {
          loggedOutCount
        }
      });
    } catch (error: any) {
      logger.error("Error logging out all sessions", error);
      return res.status(500).json({
        success: false,
        message: "Failed to logout from all devices"
      });
    }
  }
}
