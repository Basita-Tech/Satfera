import { Request, Response } from "express";
import { logger } from "../../../lib/common/logger";
import * as adminService from "../../services/userServices";
import { AuthenticatedRequest } from "../../../types";
import { updateUserProfileDetailsService } from "../../services/userServices/updateUserProfileService";

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

export async function rectifyUserProfileController(
  req: Request,
  res: Response
) {
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

  try {
    const result = await adminService.rectifyUserProfileService(userId, reason);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error sending profile for rectification:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to send profile for rectification"
    });
  }
}

export async function getPendingProfilesController(
  req: Request,
  res: Response
) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  let limit = parseInt((req.query.limit as string) || "20", 10);
  limit = Math.min(Math.max(1, limit), 100);
  const ALLOWED_STATUSES = ["pending", "approved", "rejected", "rectification"];
  const status =
    (req.query.status as
      | "pending"
      | "approved"
      | "rejected"
      | "rectification") || "pending";
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid profile review status"
    });
  }

  try {
    const result = await adminService.getPendingProfilesService(
      page,
      limit,
      status
    );

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

export async function getUserProfileDetailsController(
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
    const result = await adminService.getUserProfileDetailsService(userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Error fetching user profile details:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch user profile details"
    });
  }
}

export async function getAllProfilesController(req: Request, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  let limit = parseInt((req.query.limit as string) || "20", 10);
  limit = Math.min(Math.max(1, limit), 100);
  const isActive = req.query.isActive;
  try {
    const result = await adminService.getAllProfilesService(
      page,
      limit,
      isActive
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error fetching all profiles:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all profiles"
    });
  }
}

export async function getReportsAndAnalyticsController(
  req: Request,
  res: Response
) {
  try {
    const result = await adminService.getReportsAndAnalyticsService();
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    logger.error("Error fetching reports and analytics:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports and analytics"
    });
  }
}

export async function getAllRequestsController(req: Request, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  let limit = parseInt((req.query.limit as string) || "20", 10);
  limit = Math.min(Math.max(1, limit), 100);

  try {
    const result = await adminService.getAllRequestsService(page, limit);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error fetching all requests:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all requests"
    });
  }
}

export async function getSuperProfiles(
  req: AuthenticatedRequest,
  res: Response
) {
  const viewerId = req.user.id;
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  let limit = parseInt((req.query.limit as string) || "20", 10);
  limit = Math.min(Math.max(1, limit), 100);

  try {
    const result = await adminService.getSuperProfilesService(
      page,
      limit,
      viewerId
    );

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error fetching all profiles:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all profiles"
    });
  }
}

export async function changeUserPassword(
  req: AuthenticatedRequest,
  res: Response
) {
  const { newPassword, userId } = req.body;

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: "new password is required"
    });
  }

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User id is required"
    });
  }

  const result = await adminService.changeUserPasswordService(
    userId,
    newPassword
  );

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } else {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }
}

export async function getReportsController(req: Request, res: Response) {
  try {
    const result = await adminService.getReportsService();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error fetching reports:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports"
    });
  }
}

export async function updateReportStatusController(
  req: Request,
  res: Response
) {
  const { id, status } = req.body;

  const result = await adminService.updateReportStatusService(id, status);

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } else {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }
}

export async function updateUserProfileDetailsController(
  req: Request,
  res: Response
) {
  try {
    const { userId } = req.params;
    const profileData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const result = await updateUserProfileDetailsService(userId, profileData);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    logger.error("Error updating user profile details:", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update user profile"
    });
  }
}

export async function getAllPremiumsProfilesController(
  req: Request,
  res: Response
) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  let limit = parseInt((req.query.limit as string) || "20", 10);
  limit = Math.min(Math.max(1, limit), 100);

  try {
    const result = await adminService.getAllPremiumsProfilesService(
      page,
      limit
    );

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
