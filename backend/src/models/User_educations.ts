import mongoose, { Schema, Document } from "mongoose";

export interface IUserEducation extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  SchoolName?: string;
  HighestEducation?: string;
  FieldOfStudy?: string;
  University?: string;
  CountryOfEducation?: string;
}
const userEducationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    SchoolName: { type: String, trim: true },
    HighestEducation: { type: String, trim: true },
    FieldOfStudy: { type: String, trim: true },
    University: { type: String, trim: true },
    CountryOfEducation: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

export const UserEducation =
  (mongoose.models.UserEducation as mongoose.Model<IUserEducation>) ||
  mongoose.model<IUserEducation>("UserEducation", userEducationSchema);
