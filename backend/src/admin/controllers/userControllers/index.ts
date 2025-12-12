import { Request, Response } from "express";
import { logger } from "../../../lib/common/logger";
import * as adminService from "../../services/userServices";

export async function approveUserProfileController(
  req: Request,
  res: Response
) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const result = await adminService.approveUserProfileService(userId);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error approving user profile:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to approve profile"
    });
  }
}

export async function rejectUserProfileController(req: Request, res: Response) {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "reason is required"
      });
    }

    const result = await adminService.rejectUserProfileService(userId, reason);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error rejecting user profile:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to reject profile"
    });
  }
}

export async function getPendingProfilesController(
  req: Request,
  res: Response
) {
  try {
    const result = await adminService.getPendingProfilesService();

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error fetching pending profiles:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending profiles"
    });
  }
}

export async function verifiedProfilesController(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const result = await adminService.toggleVerificationService(userId, true);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error verifying profile:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to verify profile"
    });
  }
}

export async function unVerifiedProfilesController(
  req: Request,
  res: Response
) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const result = await adminService.toggleVerificationService(userId, false);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error unverifying profile:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to unverify profile"
    });
  }
}
