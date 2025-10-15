import mongoose, { Schema, Document } from "mongoose";

export interface IUserExpectations extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  age: {
    from: number;
    to: number;
  };
  maritalStatus: string;
  isConsumeAlcoholic: string;
  educationLevel: string;
  community: string[];
  livingInCountry: string;
  livingInState: string;
}

const userExpectationsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    age: {
      from: { type: Number, required: true, min: 18, max: 100 },
      to: { type: Number, required: true, min: 18, max: 100 },
    },
    maritalStatus: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      enum: [
        "Never Married",
        "Divorced",
        "Widowed",
        "Separated",
        "Awaiting Divorce",
        "No Preference",
      ],
    },
    isConsumeAlcoholic: {
      type: String,
      required: true,
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
      type: [String],
      required: true,
      trim: true,
      maxlength: 100,
    },
    livingInCountry: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    livingInState: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

export const UserExpectations =
  (mongoose.models.UserExpectations as mongoose.Model<IUserExpectations>) ||
  mongoose.model<IUserExpectations>("UserExpectations", userExpectationsSchema);
