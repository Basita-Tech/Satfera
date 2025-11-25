import { Response } from "express";
import { AuthenticatedRequest } from "../../types";
import { logger } from "../../lib/common/logger";
import { validationResult } from "express-validator";
import {
  updateNotificationSettings,
  getNotificationSettings
} from "../../services/userPersonalService/notificationSettingsService";

export async function getNotificationSettingsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const settings = await getNotificationSettings(userId);
      return res.status(200).json({
        success: true,
        data: settings
      });
    } catch (err: any) {
      if (err.message.includes("Profile not found")) {
        return res.status(404).json({
          success: false,
          message: "Profile not found"
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "Failed to get notification settings"
      });
    }
  } catch (error: any) {
    logger.error("Error in getNotificationSettingsController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching notification settings"
    });
  }
}

export async function updateNotificationSettingsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors
          .array()
          .map((e) => e.msg)
          .join(", ")
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const { emailNotifications, pushNotifications, smsNotifications } =
      req.body;

    try {
      const result = await updateNotificationSettings(userId, {
        emailNotifications,
        pushNotifications,
        smsNotifications
      });

      return res.status(200).json(result);
    } catch (err: any) {
      if (err.message.includes("Profile not found")) {
        return res.status(404).json({
          success: false,
          message: "Profile not found"
        });
      }

      if (err.message.includes("At least one")) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "Failed to update notification settings"
      });
    }
  } catch (error: any) {
    logger.error(
      "Error in updateNotificationSettingsController",
      error.message
    );
    return res.status(500).json({
      success: false,
      message: "Server error while updating notification settings"
    });
  }
}
