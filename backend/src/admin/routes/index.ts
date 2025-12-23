import express, { Request, Response } from "express";
import { getQueueStats, logger } from "../../lib";
import authenticate from "../../middleware/authMiddleware";
import * as adminController from "../controllers";
import { commonControllers } from "../controllers/commonControllers";
import { isAdmin } from "../../utils/utils";
import { getSystemHealth } from "../controllers/systemControllers";
import { SupportController } from "../controllers/commonControllers/supportController";

const adminRouter = express();

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

adminRouter.post(
  "/account/restore",
  authenticate,
  adminController.restoreAccountController
);

adminRouter.delete(
  "/account/hard-delete",
  authenticate,
  adminController.hardDeleteAccountController
);

adminRouter.get(
  "/accounts/deleted",
  authenticate,
  adminController.getDeletedAccountsController
);

adminRouter.get(
  "/dashboard/stats",
  authenticate,
  commonControllers.getDashboardStatsController
);

adminRouter.post(
  "/approve/profile",
  authenticate,
  adminController.approveUserProfileController
);

adminRouter.post(
  "/reject/profile",
  authenticate,
  adminController.rejectUserProfileController
);

adminRouter.post(
  "/rectify/profile",
  authenticate,
  adminController.rectifyUserProfileController
);

adminRouter.get(
  "/profiles/pending",
  authenticate,
  adminController.getPendingProfilesController
);

adminRouter.get(
  "/profile/verify/:userId",
  authenticate,
  adminController.verifiedProfilesController
);

adminRouter.get(
  "/profile/unverify/:userId",
  authenticate,
  adminController.unVerifiedProfilesController
);

adminRouter.get(
  "/all/profiles",
  authenticate,
  adminController.getAllProfilesController
);

adminRouter.get(
  "/profile/:userId",
  authenticate,
  adminController.getUserProfileDetailsController
);

adminRouter.get(
  "/analytics",
  authenticate,
  adminController.getReportsAndAnalyticsController
);

adminRouter.get(
  "/request-sent",
  authenticate,
  adminController.getAllRequestsController
);

adminRouter.get(
  "/super-profiles",
  authenticate,
  adminController.getSuperProfiles
);

adminRouter.post(
  "/user/change-password",
  authenticate,
  adminController.changeUserPassword
);

adminRouter.get("/system/health", authenticate, getSystemHealth);

adminRouter.get("/reports", authenticate, adminController.getReportsController);

adminRouter.put(
  "/reports",
  authenticate,
  adminController.updateReportStatusController
);

adminRouter.get("/support/tickets", SupportController.getAllTickets);

adminRouter.get("/support/tickets/:id", SupportController.getTicketDetails);

adminRouter.patch(
  "/support/tickets/:id/status",
  SupportController.updateStatus
);

adminRouter.post("/support/tickets/:id/messages", SupportController.addMessage);

adminRouter.get("/search", adminController.adminSearchController);

export default adminRouter;
