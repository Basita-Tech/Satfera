import express, { Request, Response } from "express";
import { getQueueStats, logger } from "../../lib";
import authenticate from "../../middleware/authMiddleware";
import * as adminController from "../controllers";
import { commonControllers } from "../controllers/commonControllers";
import { isAdmin } from "../../utils/utils";

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

export default adminRouter;
