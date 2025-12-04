import mongoose, { Schema, Document } from "mongoose";

export interface IUserHealth extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  isAlcoholic?: string;
  isTobaccoUser?: string;
  isHaveTattoos?: string;
  isHaveHIV?: string;
  isPositiveInTB?: string;
  isHaveMedicalHistory?: string;
  medicalHistoryDetails?: string;
  diet?:
    | "vegetarian"
    | "non-vegetarian"
    | "eggetarian"
    | "jain"
    | "swaminarayan"
    | "veg & non-veg"
    | "";
}

const userHealthSchema = new Schema<IUserHealth>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    isAlcoholic: {
      type: String,
      enum: ["yes", "no", "occasional", ""],
      default: ""
    },
    isTobaccoUser: {
      type: String,
      enum: ["yes", "no", "occasional", ""],
      default: ""
    },
    isHaveTattoos: {
      type: String,
      enum: ["yes", "no", ""],
      default: ""
    },
    isHaveHIV: {
      type: String,
      enum: ["yes", "no", ""],
      default: ""
    },
    isPositiveInTB: {
      type: String,
      enum: ["yes", "no", ""],
      default: ""
    },
    isHaveMedicalHistory: {
      type: String,
      enum: ["yes", "no", ""],
      default: ""
    },
    medicalHistoryDetails: {
      type: String,
      trim: true,
      default: ""
    },
    diet: {
      type: String,
      enum: [
        "vegetarian",
        "non-vegetarian",
        "eggetarian",
        "jain",
        "swaminarayan",
        "veg & non-veg",
        ""
      ],
      default: ""
    }
  },
  { timestamps: true }
);

export const UserHealth = (mongoose.models.UserHealth ??
  mongoose.model<IUserHealth>(
    "UserHealth",
    userHealthSchema
  )) as mongoose.Model<IUserHealth>;
