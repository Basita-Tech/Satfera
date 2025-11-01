import mongoose, { Schema, Document } from "mongoose";

export interface IUserHealth extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  isAlcoholic?: boolean;
  isTobaccoUser?: boolean;
  isHaveTattoos?: boolean;
  isHaveHIV?: boolean;
  isPostiviInTB?: boolean;
  isHaveMedicalHistory?: boolean;
  medicalHistoryDetails?: string;
  diet?:
    | "vegetarian"
    | "non-vegetarian"
    | "eggetarian"
    | "jain"
    | "swaminarayan"
    | "veg & non-veg"
}

const userHealthSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    isAlcoholic: {
      type: Boolean,
    },
    isTobaccoUser: {
      type: Boolean,
    },
    isHaveTattoos: {
      type: Boolean,
    },
    isHaveHIV: {
      type: Boolean,
    },
    isPostiviInTB: {
      type: Boolean,
    },
    isHaveMedicalHistory: {
      type: Boolean,
    },
    medicalHistoryDetails: {
      type: String,
      trim: true,
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
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const UserHealth =
  (mongoose.models.UserHealth as mongoose.Model<IUserHealth>) ||
  mongoose.model<IUserHealth>("UserHealth", userHealthSchema);
