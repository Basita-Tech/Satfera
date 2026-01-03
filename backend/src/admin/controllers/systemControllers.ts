import { Request, Response, NextFunction } from "express";
import {
  generateHealthReport,
  getQuickHealthStatus,
  getDetailedHealthReport,
  recordMetric
} from "../services/systemServices";

export const getSystemHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  try {
    const isAuthorized = req.user?.role === "admin";
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required."
      });
    }

    const detail = req.query.detail === "full" ? "full" : "quick";

    const report =
      detail === "full"
        ? await getDetailedHealthReport()
        : await getQuickHealthStatus();

    const responseTime = Date.now() - startTime;

    recordMetric("health_check", responseTime);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      detailLevel: detail,
      data: report
    });
  } catch (error) {
    next(error);
  }
};
