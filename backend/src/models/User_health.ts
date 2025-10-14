import mongoose, { Schema, Document } from "mongoose";

export interface IUserEducation extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  iSAlcoholic?: boolean;
  isTobaccoUser?: boolean;
  isHaveTattoos?: boolean;
  isHaveHIV?: boolean;
  isPostiviInTB?: boolean;
  isHaveMedicalHistory?: boolean;
  medicalHistoryDetails?: string;
}

const userHealthSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    iSAlcoholic: {
      type: Boolean,
      default: false,
    },
    isTobaccoUser: {
      type: Boolean,
      default: false,
    },
    isHaveTattoos: {
      type: Boolean,
      default: false,
    },
    isHaveHIV: {
      type: Boolean,
      default: false,
    },
    isPostiviInTB: {
      type: Boolean,
      default: false,
    },
    isHaveMedicalHistory: {
      type: Boolean,
      default: false,
    },
    medicalHistoryDetails: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

userHealthSchema.index({ userId: 1 }, { unique: true });

export const UserHealth =
  (mongoose.models.UserHealth as mongoose.Model<IUserEducation>) ||
  mongoose.model<IUserEducation>("UserHealth", userHealthSchema);
