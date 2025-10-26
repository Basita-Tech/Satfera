import mongoose, { Schema, Document } from "mongoose";

export interface IUserExpectations extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  age: {
    from: number;
    to: number;
  };
  maritalStatus: string;
  isConsumeAlcoholic: string;
  educationLevel: string[] | string | object;
  community: string[] | string | object;
  livingInCountry: string[] | string | object;
  livingInState: string[] | string | object;
  profession?: string[] | string | object;
}

const userExpectationsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
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
      type: Schema.Types.Mixed,
      trim: true,
    },
    community: {
      type: Schema.Types.Mixed,
      required: true,
      trim: true,
    },
    livingInCountry: {
      type: Schema.Types.Mixed,
      required: true,
      trim: true,
    },
    livingInState: {
      type: Schema.Types.Mixed,
      trim: true,
    },
    profession: {
      type: Schema.Types.Mixed,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserExpectations =
  (mongoose.models.UserExpectations as mongoose.Model<IUserExpectations>) ||
  mongoose.model<IUserExpectations>("UserExpectations", userExpectationsSchema);
