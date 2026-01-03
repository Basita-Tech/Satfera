import { AuthenticatedRequest } from "../../../types";
import { Response, Request } from "express";
import { adminSearchService, commonService } from "../../services";

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

export async function adminSearchController(req: Request, res: Response) {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10), 1);
    const limitRequested = parseInt(String(req.query.limit || "25"), 10);
    const limit = Math.min(Math.max(limitRequested, 1), 100);

    const filters = {
      ...req.query,
      page,
      limit
    };

    const result = await adminSearchService(filters);

    return res.json({
      success: true,
      data: result.results,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: page * limit < result.total
      }
    });
  } catch (err) {
    console.error("adminSearchController error:", err);
    return res.status(500).json({
      success: false,
      message: "Search failed"
    });
  }
}
