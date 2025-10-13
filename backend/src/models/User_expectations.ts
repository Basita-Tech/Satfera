import mongoose, { Schema, Document } from "mongoose";

export interface IUserExpectations extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  userProfileBio?: string;
  isConsumeAlcoholic?: string;
  educationLevel?: string;
  community?: string;
  whereIsLiving?: string;
}

const userExpectationsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    userProfileBio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isConsumeAlcoholic: {
      type: String,
      enum: ["yes", "no", "occasionally"],
    },
    educationLevel: {
      type: String,
      trim: true,
      maxlength: 100,
      enum: [
        "High School",
        "Bachelor's Degree",
        "Graduate",
        "Post Graduate",
        "Doctorate",
        "Professional",
        "Other",
      ],
    },
    community: {
      type: String,
      trim: true,
      maxlength: 100,
      enum: ["Yes", "No", "Occasionally"],
    },
    whereIsLiving: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

export const UserExpectations =
  mongoose.models.UserExpectations ||
  mongoose.model<IUserExpectations>("UserExpectations", userExpectationsSchema);
