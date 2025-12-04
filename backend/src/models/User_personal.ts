import mongoose, { Schema, Document } from "mongoose";

export interface IUserPersonal extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  timeOfBirth?: string;
  height?: number | string;
  weight?: number | string;
  astrologicalSign?: string;
  birthPlace?: string;
  birthState?: string;
  religion: string;
  marriedStatus: string;
  dosh?: string;
  subCaste?: string;
  marryToOtherReligion?: boolean;
  full_address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    isYourHome?: boolean;
  };
  nationality?: string;
  isResidentOfIndia?: boolean;
  residingCountry?: string;
  visaType?: string;
  isHaveChildren?: boolean;
  numberOfChildren?: number;
  isChildrenLivingWithYou?: boolean;
  isYouLegallySeparated?: boolean;
  separatedSince?: string;
  divorceStatus: string;
}

const userPersonalSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    timeOfBirth: { type: String },
    height: { type: Schema.Types.Mixed },
    weight: { type: Schema.Types.Mixed },
    astrologicalSign: { type: String },
    birthPlace: { type: String },
    birthState: { type: String },
    religion: { type: String, required: true },
    subCaste: { type: String },
    dosh: { type: String },
    marriedStatus: { type: String, required: true },
    marryToOtherReligion: { type: Boolean },
    full_address: {
      street1: { type: String },
      street2: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      isYourHome: { type: Boolean }
    },
    nationality: { type: String },
    isResidentOfIndia: { type: Boolean },
    residingCountry: { type: String },
    visaType: { type: String },
    isHaveChildren: { type: Boolean },
    numberOfChildren: { type: Number },
    isChildrenLivingWithYou: { type: Boolean },
    isYouLegallySeparated: { type: Boolean },
    separatedSince: { type: String },
    divorceStatus: {
      type: String
    }
  },
  { timestamps: true }
);

export const UserPersonal: mongoose.Model<IUserPersonal> =
  (mongoose.models.UserPersonal as mongoose.Model<IUserPersonal>) ||
  mongoose.model<IUserPersonal>("UserPersonal", userPersonalSchema);
