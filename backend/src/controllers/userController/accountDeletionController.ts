import { Response } from "express";
import { AuthenticatedRequest } from "../../types";
import { logger } from "../../lib/common/logger";
import { validationResult } from "express-validator";
import {
  deleteAccount,
  getAccountDeletionStatus
} from "../../services/userPersonalService/accountDeletionService";

export async function deleteAccountController(
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

    const { reason } = req.body;

    try {
      const result = await deleteAccount(userId, reason);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to delete account";

      if (errorMessage.startsWith("AlreadyDeleted:")) {
        return res.status(400).json({
          success: false,
          message: errorMessage.replace("AlreadyDeleted: ", "")
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (
        errorMessage.includes("Deletion reason must") ||
        errorMessage.includes("reason")
      ) {
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
    logger.error("Error in deleteAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting account"
    });
  }
}

export async function getAccountDeletionStatusController(
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
      const status = await getAccountDeletionStatus(userId);
      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to get deletion status"
      });
    }
  } catch (error: any) {
    logger.error("Error in getAccountDeletionStatusController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching deletion status"
    });
  }
}
