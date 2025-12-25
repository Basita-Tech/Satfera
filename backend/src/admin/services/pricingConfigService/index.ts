import { logger } from "../../../lib";
import { PricingConfig, MonthName } from "../../../models/PricingConfig";

interface CreateOrUpdatePricingConfigInput {
  monthName: MonthName;
  features?: string[];
  price: number;
}

export async function getPricingConfigsService(filters?: {
  monthName?: MonthName;
}) {
  try {
    const query: any = {};

    if (filters?.monthName) {
      query.monthName = filters.monthName;
    }

    const configs = await PricingConfig.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      data: configs,
      count: configs.length
    };
  } catch (error: any) {
    logger.error("Error fetching pricing configs:", {
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to fetch pricing configs");
  }
}

export async function getPricingConfigByIdService(configId: string) {
  try {
    const config = await PricingConfig.findById(configId).lean();

    if (!config) {
      return {
        success: false,
        message: "Pricing config not found"
      };
    }

    return {
      success: true,
      data: config
    };
  } catch (error: any) {
    logger.error("Error fetching pricing config by ID:", {
      configId,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to fetch pricing config");
  }
}

export async function createOrUpdatePricingConfigService(
  input: CreateOrUpdatePricingConfigInput
) {
  try {
    const { monthName, features, price } = input;

    const existingConfig = await PricingConfig.findOne({ monthName });

    if (existingConfig) {
      existingConfig.features = features || existingConfig.features;
      existingConfig.price = price;

      await existingConfig.save();

      return {
        success: true,
        message: "Pricing config updated successfully",
        data: existingConfig
      };
    } else {
      const newConfig = new PricingConfig({
        monthName,
        features: features || [],
        price
      });

      await newConfig.save();

      return {
        success: true,
        message: "Pricing config created successfully",
        data: newConfig
      };
    }
  } catch (error: any) {
    logger.error("Error creating/updating pricing config:", {
      input,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to create/update pricing config");
  }
}

export async function deletePricingConfigService(configId: string) {
  try {
    const config = await PricingConfig.findById(configId);

    if (!config) {
      return {
        success: false,
        message: "Pricing config not found"
      };
    }

    await PricingConfig.findByIdAndDelete(configId);

    return {
      success: true,
      message: "Pricing config deleted successfully",
      data: config
    };
  } catch (error: any) {
    logger.error("Error deleting pricing config:", {
      configId,
      error: error.message,
      stack: error.stack
    });
    throw new Error("Failed to delete pricing config");
  }
}
