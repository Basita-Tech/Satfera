import mongoose, { Schema, Document } from "mongoose";

export interface IUserEducation extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  isAlcoholic?: boolean;
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
  },
  {
    timestamps: true,
  }
);

userHealthSchema.index({ userId: 1 }, { unique: true });

export const UserHealth =
  (mongoose.models.UserHealth as mongoose.Model<IUserEducation>) ||
  mongoose.model<IUserEducation>("UserHealth", userHealthSchema);
