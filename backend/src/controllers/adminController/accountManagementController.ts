import { Response } from "express";
import { AuthenticatedRequest } from "../../types";
import { logger } from "../../lib/common/logger";
import {
  restoreDeletedAccount,
  hardDeleteAccount,
  getDeletedAccounts
} from "../../admin/services";

export async function restoreAccountController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const adminId = req.user?.id;
    const adminRole = req.user?.role;

    if (!adminId || adminRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required"
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    try {
      const result = await restoreDeletedAccount(adminId, userId);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to restore account";

      if (errorMessage.includes("Unauthorized")) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Admin access required"
        });
      }

      if (errorMessage.startsWith("NotDeleted:")) {
        return res.status(400).json({
          success: false,
          message: errorMessage.replace("NotDeleted: ", "")
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in restoreAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while restoring account"
    });
  }
}

export async function hardDeleteAccountController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const adminId = req.user?.id;
    const adminRole = req.user?.role;

    if (!adminId || adminRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required"
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    try {
      const result = await hardDeleteAccount(adminId, userId);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage =
        err.message || "Failed to delete account permanently";

      if (errorMessage.includes("Unauthorized")) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Admin access required"
        });
      }

      if (errorMessage.includes("User not found")) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in hardDeleteAccountController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while permanently deleting account"
    });
  }
}

export async function getDeletedAccountsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const adminId = req.user?.id;
    const adminRole = req.user?.role;

    if (!adminId || adminRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required"
      });
    }

    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20)
    );

    try {
      const result = await getDeletedAccounts(adminId, page, limit);
      return res.status(200).json(result);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to get deleted accounts";

      if (errorMessage.includes("Unauthorized")) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Admin access required"
        });
      }

      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
  } catch (error: any) {
    logger.error("Error in getDeletedAccountsController", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching deleted accounts"
    });
  }
}
