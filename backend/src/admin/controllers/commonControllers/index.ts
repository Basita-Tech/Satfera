import { AuthenticatedRequest } from "../../../types";
import { Response } from "express";
import { commonService } from "../../services";

class commonControllers {
  static async getDashboardStatsController(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const stats = await commonService.getAdminDashboardStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error in getDashboardStatsController:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch dashboard stats" });
    }
  }
}

export { commonControllers };
