import mongoose, { Schema, Document } from "mongoose";

export interface IUserPersonal extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  dateOfBirth?: Date;
  timeOfBirth?: string;
  height?: number;
  weight?: number;
  astrologicalSign?: string;
  BirthPlace?: string;
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
  occupation?: string;
  isChildrenLivingWithYou?: boolean;
  isYouLegallySeparated?: boolean;
  separatedSince?: string;
}

const userPersonalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    timeOfBirth: { type: String },
    height: { type: Number },
    weight: { type: Number },
    astrologicalSign: { type: String },
    BirthPlace: { type: String },
    religion: { type: String, required: true },
    subCaste: { type: String },
    dosh: { type: String },
    marriedStatus: { type: String, required: true },
    marryToOtherReligion: { type: Boolean },
    dateOfBirth: { type: Date, required: true },
    full_address: {
      street1: { type: String },
      street2: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      isYourHome: { type: Boolean },
    },
    nationality: { type: String },
    isResidentOfIndia: { type: Boolean },
    residingCountry: { type: String },
    visaType: { type: String },
    isHaveChildren: { type: Boolean },
    numberOfChildren: { type: Number },
    occupation: { type: String },
    isChildrenLivingWithYou: { type: Boolean },
    isYouLegallySeparated: { type: Boolean },
    separatedSince: { type: String },
  },
  { timestamps: true }
);

export const UserPersonal: mongoose.Model<IUserPersonal> =
  (mongoose.models.UserPersonal as mongoose.Model<IUserPersonal>) ||
  mongoose.model<IUserPersonal>("UserPersonal", userPersonalSchema);
