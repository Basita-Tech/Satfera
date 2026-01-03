import express, { Request, Response } from "express";
import { validationResult } from "express-validator";
import { getQueueStats, logger } from "../../lib";
import authenticate from "../../middleware/authMiddleware";
import * as adminController from "../controllers";
import { commonControllers } from "../controllers/commonControllers";
import { asyncHandler, isAdmin } from "../../utils/utils";
import { getSystemHealth } from "../controllers/systemControllers";
import { SupportController } from "../controllers/commonControllers/supportController";
import adminAuditMiddleware from "../../middleware/adminAuditMiddleware";
import {
  createEmailTemplateValidation,
  updateEmailTemplateValidation,
  createOrUpdatePricingConfigValidation,
  updateUserProfileValidation
} from "../../validation";

import { getAuditLogsController } from "../controllers/auditController";
const adminRouter = express();

const handleValidationErrors = (
  req: Request,
  res: Response,
  next: Function
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  next();
};

// temp route
adminRouter.get("/queue-stats", async (req: Request, res: Response) => {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error("Error fetching queue stats:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch queue stats" });
  }
});

adminRouter.use(authenticate, (req: Request, res: Response, next) => {
  const isAdminn = isAdmin(req.user.role);
  if (!isAdminn) {
    return res.status(403).json({
      success: false,
      message: "Access denied."
    });
  }
  next();
});

adminRouter.use(adminAuditMiddleware);

adminRouter.post(
  "/account/restore",
  authenticate,
  asyncHandler(adminController.restoreAccountController)
);

adminRouter.delete(
  "/account/hard-delete",
  authenticate,
  asyncHandler(adminController.hardDeleteAccountController)
);

adminRouter.post(
  "/account/delete",
  authenticate,
  asyncHandler(adminController.softDeleteAccountController)
);

adminRouter.get(
  "/accounts/deleted",
  authenticate,
  asyncHandler(adminController.getDeletedAccountsController)
);

adminRouter.get(
  "/dashboard/stats",
  authenticate,
  asyncHandler(commonControllers.getDashboardStatsController)
);

adminRouter.post(
  "/approve/profile",
  authenticate,
  asyncHandler(adminController.approveUserProfileController)
);

adminRouter.post(
  "/reject/profile",
  authenticate,
  asyncHandler(adminController.rejectUserProfileController)
);

adminRouter.post(
  "/rectify/profile",
  authenticate,
  asyncHandler(adminController.rectifyUserProfileController)
);

adminRouter.get(
  "/profiles/all/premiums",
  authenticate,
  asyncHandler(adminController.getAllPremiumsProfilesController)
);

adminRouter.get(
  "/profiles/pending",
  authenticate,
  asyncHandler(adminController.getPendingProfilesController)
);

adminRouter.get(
  "/profile/verify/:userId",
  authenticate,
  asyncHandler(adminController.verifiedProfilesController)
);

adminRouter.get(
  "/profile/unverify/:userId",
  authenticate,
  asyncHandler(adminController.unVerifiedProfilesController)
);

adminRouter.get(
  "/all/profiles",
  authenticate,
  asyncHandler(adminController.getAllProfilesController)
);

adminRouter.get(
  "/profile/:userId",
  authenticate,
  asyncHandler(adminController.getUserProfileDetailsController)
);

adminRouter.put(
  "/profile/:userId",
  authenticate,
  updateUserProfileValidation,
  handleValidationErrors,
  asyncHandler(adminController.updateUserProfileDetailsController)
);

adminRouter.get(
  "/analytics",
  authenticate,
  asyncHandler(adminController.getReportsAndAnalyticsController)
);

adminRouter.get(
  "/request-sent",
  authenticate,
  asyncHandler(adminController.getAllRequestsController)
);

adminRouter.post(
  "/request-sent/:id/reminder",
  authenticate,
  asyncHandler(adminController.sendRequestReminder)
);

adminRouter.get(
  "/super-profiles",
  authenticate,
  asyncHandler(adminController.getSuperProfiles)
);

adminRouter.post(
  "/user/change-password",
  authenticate,
  asyncHandler(adminController.changeUserPassword)
);

adminRouter.get("/system/health", authenticate, asyncHandler(getSystemHealth));

adminRouter.get(
  "/reports",
  authenticate,
  asyncHandler(adminController.getReportsController)
);

adminRouter.put(
  "/reports",
  authenticate,
  asyncHandler(adminController.updateReportStatusController)
);

adminRouter.get(
  "/support/tickets",
  asyncHandler(SupportController.getAllTickets)
);

adminRouter.get(
  "/support/tickets/:id",
  asyncHandler(SupportController.getTicketDetails)
);

adminRouter.patch(
  "/support/tickets/:id/status",
  asyncHandler(SupportController.updateStatus)
);

adminRouter.post(
  "/support/tickets/:id/messages",
  asyncHandler(SupportController.addMessage)
);

adminRouter.get("/search", asyncHandler(adminController.adminSearchController));

adminRouter.get(
  "/email-templates",
  authenticate,
  asyncHandler(adminController.getEmailTemplatesController)
);

adminRouter.get(
  "/email-templates/:id",
  authenticate,
  asyncHandler(adminController.getEmailTemplateByIdController)
);

adminRouter.post(
  "/email-templates",
  authenticate,
  createEmailTemplateValidation,
  handleValidationErrors,
  asyncHandler(adminController.createEmailTemplateController)
);

adminRouter.put(
  "/email-templates/:id",
  authenticate,
  updateEmailTemplateValidation,
  handleValidationErrors,
  asyncHandler(adminController.updateEmailTemplateController)
);

adminRouter.delete(
  "/email-templates/:id",
  authenticate,
  asyncHandler(adminController.deleteEmailTemplateController)
);

adminRouter.get(
  "/pricing-configs",
  authenticate,
  asyncHandler(adminController.getPricingConfigsController)
);

adminRouter.get(
  "/pricing-configs/:id",
  authenticate,
  asyncHandler(adminController.getPricingConfigByIdController)
);

adminRouter.post(
  "/pricing-configs",
  authenticate,
  createOrUpdatePricingConfigValidation,
  handleValidationErrors,
  asyncHandler(adminController.createOrUpdatePricingConfigController)
);

adminRouter.delete(
  "/pricing-configs/:id",
  authenticate,
  asyncHandler(adminController.deletePricingConfigController)
);

adminRouter.get("/audits", authenticate, asyncHandler(getAuditLogsController));

adminRouter.post(
  "/account/deactivate",
  authenticate,
  asyncHandler(adminController.deactivateAccountController)
);

adminRouter.post(
  "/account/activate",
  authenticate,
  asyncHandler(adminController.activateAccountController)
);

export default adminRouter;
