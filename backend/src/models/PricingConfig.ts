import mongoose, { Schema, Document } from "mongoose";

export enum MonthName {
  ONE_MONTH = "1_month",
  THREE_MONTHS = "3_months",
  SIX_MONTHS = "6_months",
  TWELVE_MONTHS = "12_months"
}

export interface PricingConfig extends Document {
  monthName: MonthName;
  features: string[];
  price: number;
}

const PricingConfigSchema = new Schema<PricingConfig>(
  {
    monthName: {
      type: String,
      enum: Object.values(MonthName),
      required: true,
      unique: true
    },
    features: { type: [String], default: [] },
    price: { type: Number, required: true }
  },
  { timestamps: true }
);

export const PricingConfig =
  (mongoose.models.PricingConfig as mongoose.Model<PricingConfig>) ||
  mongoose.model<PricingConfig>("PricingConfig", PricingConfigSchema);
