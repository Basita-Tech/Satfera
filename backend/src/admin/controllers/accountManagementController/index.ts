import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { logger } from "../../../lib/common/logger";
import { recordAudit } from "../../../lib/common/auditLogger";
import mongoose from "mongoose";
import {
  restoreDeletedAccount,
  hardDeleteAccount,
  getDeletedAccounts,
  deleteAccount
} from "../../services/accountManagementService";

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

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format"
      });
    }

    const result = await restoreDeletedAccount(adminId, userId);
    if (result && result.success) {
      void recordAudit({
        adminId: adminId,
        adminName: req.user?.fullName || req.user?.email || "Admin",
        action: "RestoreAccount",
        targetType: "User",
        targetId: userId,
        details: { message: result.message }
      });
    }
    return res.status(200).json(result);
  } catch (err: any) {
    const errorMessage = err.message || "Failed to restore account";
    logger.error("Error in restoreAccountController:", {
      error: errorMessage,
      userId: req.body?.userId,
      adminId: req.user?.id
    });

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

    if (res.headersSent) {
      return;
    }

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

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format"
      });
    }

    const result = await hardDeleteAccount(adminId, userId);
    if (result && result.success) {
      void recordAudit({
        adminId: adminId,
        adminName: req.user?.fullName || req.user?.email || "Admin",
        action: "HardDeleteAccount",
        targetType: "User",
        targetId: userId,
        details: { message: result.message }
      });
    }
    return res.status(200).json(result);
  } catch (err: any) {
    const errorMessage = err.message || "Failed to delete account permanently";
    logger.error("Error in hardDeleteAccountController:", {
      error: errorMessage,
      userId: req.body?.userId,
      adminId: req.user?.id
    });

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

    if (res.headersSent) {
      return;
    }

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

    const result = await getDeletedAccounts(adminId, page, limit);
    return res.status(200).json(result);
  } catch (err: any) {
    const errorMessage = err.message || "Failed to get deleted accounts";
    logger.error("Error in getDeletedAccountsController:", {
      error: errorMessage,
      adminId: req.user?.id
    });

    if (errorMessage.includes("Unauthorized")) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required"
      });
    }

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: "Server error while fetching deleted accounts"
    });
  }
}

export async function softDeleteAccountController(
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

    const { userId, deletionReason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format"
      });
    }

    if (!deletionReason) {
      return res.status(400).json({
        success: false,
        message: "delete reason is required"
      });
    }

    if (
      typeof deletionReason !== "string" ||
      deletionReason.trim().length < 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason must be at least 10 characters"
      });
    }

    if (deletionReason.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason must not exceed 500 characters"
      });
    }

    const result = await deleteAccount(userId, deletionReason.trim());
    if (result && result.success) {
      void recordAudit({
        adminId: adminId,
        adminName: req.user?.fullName || req.user?.email || "Admin",
        action: "SoftDeleteAccount",
        targetType: "User",
        targetId: userId,
        details: { reason: deletionReason }
      });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error("Error in softDeleteAccountController:", {
      error: error.message,
      userId: req.body?.userId,
      adminId: req.user?.id
    });

    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: "Server error while deleting account"
    });
  }
}
