import { Request, Response } from "express";
import { validationResult } from "express-validator";
import {
  getPricingConfigsService,
  getPricingConfigByIdService,
  createOrUpdatePricingConfigService,
  deletePricingConfigService
} from "../../services/pricingConfigService";
import { MonthName } from "../../../models/PricingConfig";
import { recordAudit } from "../../../lib/common/auditLogger";

export async function getPricingConfigsController(req: Request, res: Response) {
  try {
    const { monthName } = req.query;

    const filters: any = {};
    if (monthName) {
      filters.monthName = monthName as MonthName;
    }

    const result = await getPricingConfigsService(filters);

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pricing configs"
    });
  }
}

export async function getPricingConfigByIdController(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Config ID is required"
      });
    }

    const result = await getPricingConfigByIdService(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pricing config"
    });
  }
}

export async function createOrUpdatePricingConfigController(
  req: Request,
  res: Response
) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { monthName, features, price } = req.body;

    const result = await createOrUpdatePricingConfigService({
      monthName,
      features,
      price
    });

    if (result && result.success) {
      void recordAudit({
        adminId: (req as any).user?.id,
        adminName:
          (req as any).user?.fullName || (req as any).user?.email || "Admin",
        action: result.message.includes("created")
          ? "CreatePricingConfig"
          : "UpdatePricingConfig",
        targetType: "PricingConfig",
        targetId: result.data?.id || result.data?._id,
        details: { monthName }
      });
    }

    return res
      .status(result.message.includes("created") ? 201 : 200)
      .json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create/update pricing config"
    });
  }
}

export async function deletePricingConfigController(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Config ID is required"
      });
    }

    const result = await deletePricingConfigService(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    void recordAudit({
      adminId: (req as any).user?.id,
      adminName:
        (req as any).user?.fullName || (req as any).user?.email || "Admin",
      action: "DeletePricingConfig",
      targetType: "PricingConfig",
      targetId: id
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete pricing config"
    });
  }
}
