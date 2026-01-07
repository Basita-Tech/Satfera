import { Request, Response } from "express";
import { logger } from "../../../lib/common/logger";
import * as adminService from "../../services/userServices";
import { AuthenticatedRequest } from "../../../types";
import { updateUserProfileDetailsService } from "../../services/userServices/updateUserProfileService";
import { recordAudit } from "../../../lib/common/auditLogger";
import { User, ConnectionRequest, Profile } from "../../../models";
import { APP_CONFIG } from "../../../utils/constants";
import { buildEmailFromTemplate } from "../../../lib/emails/templateService";
import { sendMail } from "../../../lib/emails";
import { EmailTemplateType } from "../../../models";

export async function approveUserProfileController(
  req: AuthenticatedRequest,
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

    if (result.success) {
      try {
        const target = await User.findById(userId)
          .select("firstName lastName")
          .lean();
        const targetDisplayName = target
          ? `${target.firstName || ""} ${target.lastName || ""}`.trim()
          : undefined;
        void recordAudit({
          adminId: req.user!.id,
          adminName: req.user!.fullName || req.user!.email || "Admin",
          action: "ApproveProfile",
          targetType: "User",
          targetId: userId,
          targetDisplayName,
          details: { message: result.message },
          req: req as any
        });
      } catch (e) {}
    }

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

export async function rejectUserProfileController(
  req: AuthenticatedRequest,
  res: Response
) {
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

    if (result.success) {
      try {
        const target = await User.findById(userId)
          .select("firstName lastName")
          .lean();
        const targetDisplayName = target
          ? `${target.firstName || ""} ${target.lastName || ""}`.trim()
          : undefined;
        void recordAudit({
          adminId: req.user!.id,
          adminName: req.user!.fullName || req.user!.email || "Admin",
          action: "RejectProfile",
          targetType: "User",
          targetId: userId,
          targetDisplayName,
          details: { reason },
          req: req as any
        });
      } catch (e) {}
    }

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

    if (result.success) {
      try {
        const target = await User.findById(userId)
          .select("firstName lastName")
          .lean();
        const targetDisplayName = target
          ? `${target.firstName || ""} ${target.lastName || ""}`.trim()
          : undefined;
        void recordAudit({
          adminId: (req as any).user?.id,
          adminName:
            (req as any).user?.fullName || (req as any).user?.email || "Admin",
          action: "RectifyProfile",
          targetType: "User",
          targetId: userId,
          targetDisplayName,
          details: { reason },
          req: req as any
        });
      } catch (e) {
        // swallow
      }
    }

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

  const userId = (req.query.userId as string) || undefined;
  const username = (req.query.username as string) || undefined;
  const maleToFemale = Boolean(req.query.maleToFemale);
  const femaleToMale = Boolean(req.query.femaleToMale);
  const status = req.query.status;
  try {
    const result = await adminService.getAllRequestsService(page, limit, {
      userId,
      username,
      maleToFemale,
      femaleToMale,
      status
    });
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

export async function sendRequestReminder(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { id } = req.params as { id?: string };

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "request id is required" });
    }

    const conn = await ConnectionRequest.findById(id)
      .populate("sender")
      .populate("receiver")
      .lean();

    if (!conn) {
      return res
        .status(404)
        .json({ success: false, message: "Connection request not found" });
    }

    if (conn.status && conn.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be reminded"
      });
    }

    const sender: any = (conn as any).sender;
    const receiver: any = (conn as any).receiver;

    if (!receiver || !receiver.email) {
      return res
        .status(400)
        .json({ success: false, message: "Target user has no email" });
    }

    const senderProfile = await Profile.findOne({ userId: sender._id }).lean();

    const requesterName =
      `${sender.firstName || ""} ${sender.lastName || ""}`.trim();
    const requesterProfileName = requesterName;
    const profileUrl = `${APP_CONFIG.FRONTEND_URL}/profile/${sender._id}`;
    const photoUrl =
      senderProfile?.photos?.closerPhoto?.url ||
      senderProfile?.photos?.personalPhotos?.[0]?.url ||
      APP_CONFIG.BRAND_LOGO_URL;

    const acceptUrl = `${APP_CONFIG.FRONTEND_URL}/request/${id}/accept`;
    const rejectUrl = `${APP_CONFIG.FRONTEND_URL}/request/${id}/reject`;

    const variables: Record<string, string> = {
      brandName: APP_CONFIG.BRAND_NAME || "Satfera",
      logoUrl: APP_CONFIG.BRAND_LOGO_URL || "",
      userName: `${receiver.firstName || ""} ${receiver.lastName || ""}`.trim(),
      requesterName,
      requesterProfileName,
      profileUrl,
      photoUrl,
      acceptUrl,
      rejectUrl,
      requestDate: conn.createdAt
        ? new Date(conn.createdAt).toLocaleString()
        : "",
      matchScore: (conn as any).matchScore
        ? String((conn as any).matchScore)
        : "",
      supportContact: "support@satfera.in",
      dashboardLink: APP_CONFIG.FRONTEND_URL
    };

    const built = await buildEmailFromTemplate(
      EmailTemplateType.NewConnectionRequest as any,
      variables
    );

    if (!built) {
      return res.status(500).json({
        success: false,
        message: "Email template not found or inactive"
      });
    }

    void sendMail({
      to: receiver.email,
      subject: built.subject,
      html: built.html,
      text: built.text
    }).catch((err) => {
      logger.error("Error sending reminder email (async):", {
        error: err?.message || err,
        requestId: id,
        to: receiver.email
      });
    });

    void recordAudit({
      adminId: req.user?.id,
      adminName: req.user?.fullName || req.user?.email || "Admin",
      action: "SendRequestReminder",
      targetType: "ConnectionRequest",
      targetId: id,
      targetDisplayName: requesterName,
      details: { message: "Reminder email queued for delivery" },
      req: req as any
    });

    return res.status(200).json({
      success: true,
      message: "Reminder email queued for delivery"
    });
  } catch (error: any) {
    logger.error("Error sending request reminder:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send reminder"
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
    void recordAudit({
      adminId: req.user?.id,
      adminName: req.user?.fullName || req.user?.email || "Admin",
      action: "ChangeUserPassword",
      targetType: "User",
      targetId: userId,
      details: { message: result.message }
    });

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
    void recordAudit({
      adminId: (req as any).user?.id,
      adminName:
        (req as any).user?.fullName || (req as any).user?.email || "Admin",
      action: "UpdateReportStatus",
      targetType: "Report",
      targetId: id,
      details: { newStatus: status }
    });

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
    if (result.success) {
      void recordAudit({
        adminId: (req as any).user?.id,
        adminName:
          (req as any).user?.fullName || (req as any).user?.email || "Admin",
        action: "UpdateUserProfile",
        targetType: "User",
        targetId: userId,
        details: { updatedFields: Object.keys(profileData) }
      });
    }

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

export async function activateAccountController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const result = await adminService.activateAccount(userId);
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

export async function deactivateAccountController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { reason, userId } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    try {
      const result = await adminService.deactivateAccount(userId, reason);
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
