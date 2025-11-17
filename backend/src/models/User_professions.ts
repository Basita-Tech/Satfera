import mongoose, { Schema, Document } from "mongoose";

export interface IUserProfession extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  EmploymentStatus?: string;
  Occupation?: string;
  AnnualIncome?: string;
  OrganizationName?: string;
}

const userProfessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    EmploymentStatus: {
      type: String,
      trim: true,
      enum: [
        "private sector",
        "government",
        "self-employed",
        "unemployed",
        "student",
        "business"
      ]
    },
    Occupation: { type: String, trim: true },
    AnnualIncome: { type: String, trim: true },
    OrganizationName: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

export const UserProfession =
  (mongoose.models.UserProfession as mongoose.Model<IUserProfession>) ||
  mongoose.model<IUserProfession>("UserProfession", userProfessionSchema);
