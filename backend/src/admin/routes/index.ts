import express, { Request, Response } from "express";
import { getQueueStats, logger } from "../../lib";
import authenticate from "../../middleware/authMiddleware";
import * as adminController from "../controllers";
import { commonControllers } from "../controllers/commonControllers";

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

adminRouter.post(
  "/profile/verify/:userId",
  authenticate,
  adminController.verifiedProfilesController
);

adminRouter.post(
  "/profile/unverify/:userId",
  authenticate,
  adminController.unVerifiedProfilesController
);

export default adminRouter;
