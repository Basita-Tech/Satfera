import { Response } from "express";
import { AuthenticatedRequest } from "../../types";
import { logger } from "../../lib/common/logger";
import {
  deactivateAccount,
  activateAccount,
  getAccountStatus
} from "../../services/userPersonalService/accountStatusService";

export async function deactivateAccountController(
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

    const { reason } = req.body;

    try {
      const result = await deactivateAccount(userId, reason);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to deactivate account";

      if (errorMessage.startsWith("Cooldown:")) {
        return res.status(429).json({
          success: false,
          message: errorMessage.replace("Cooldown: ", "")
        });
      }

      if (errorMessage.startsWith("AlreadyDeactivated:")) {
        return res.status(400).json({
          success: false,
          message: errorMessage.replace("AlreadyDeactivated: ", "")
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (errorMessage.includes("deleted account")) {
        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in deactivateAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while deactivating account"
    });
  }
}

export async function activateAccountController(
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
      const result = await activateAccount(userId);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to activate account";

      if (errorMessage.startsWith("Cooldown:")) {
        return res.status(429).json({
          success: false,
          message: errorMessage.replace("Cooldown: ", "")
        });
      }

      if (errorMessage.startsWith("AlreadyActive:")) {
        return res.status(400).json({
          success: false,
          message: errorMessage.replace("AlreadyActive: ", "")
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (errorMessage.includes("deleted account")) {
        return res.status(400).json({
          success: false,
          message: errorMessage
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in activateAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while activating account"
    });
  }
}

export async function getAccountStatusController(
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
      const status = await getAccountStatus(userId);
      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to get account status"
      });
    }
  } catch (error: any) {
    logger.error("Error in getAccountStatusController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching account status"
    });
  }
}
