import mongoose, { Schema, Document } from "mongoose";

export interface IUserFamily extends Document {
  userId: { type: Schema.Types.ObjectId; ref: "User" };
  fatherName?: string;
  motherName?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  fatherContact?: string;
  motherContact?: string;
  fatherNativePlace?: string;
  doYouHaveChildren?: boolean;
  grandFatherName?: string;
  grandMotherName?: string;
  naniName?: string;
  nanaName?: string;
  nanaNativePlace?: string;
  familyType?: string;
  haveSibling?: boolean;
  howManySiblings?: number;
  siblingDetails?: [
    {
      name: string;
      relation:
        | "Elder Brother"
        | "Younger Brother"
        | "Elder Sister"
        | "Younger Sister";
      maritalStatus?: string;
    }
  ];
}

const userFamilySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    fatherName: {
      type: String,
      trim: true
    },
    motherName: {
      type: String,
      trim: true
    },
    fatherOccupation: {
      type: String,
      trim: true
    },
    motherOccupation: {
      type: String,
      trim: true
    },
    fatherContact: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    motherContact: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    fatherNativePlace: {
      type: String,
      trim: true
    },
    doYouHaveChildren: {
      type: Boolean,
      trim: true
    },
    grandFatherName: {
      type: String,
      trim: true
    },
    grandMotherName: {
      type: String,
      trim: true
    },
    naniName: {
      type: String,
      trim: true
    },
    nanaName: {
      type: String,
      trim: true
    },
    nanaNativePlace: {
      type: String,
      trim: true
    },
    familyType: {
      type: String,
      trim: true
    },
    haveSibling: {
      type: Boolean,
      trim: true
    },
    howManySiblings: {
      type: Number,
      min: 0,
      trim: true
    },
    siblingDetails: [
      {
        name: {
          type: String,
          trim: true
        },
        relation: {
          type: String,
          enum: [
            "Elder Brother",
            "Younger Brother",
            "Elder Sister",
            "Younger Sister"
          ]
        },
        maritalStatus: {
          type: String,
          trim: true,
          enum: ["Married", "Unmarried"]
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

export const UserFamily: mongoose.Model<IUserFamily> =
  (mongoose.models.UserFamily as mongoose.Model<IUserFamily>) ||
  mongoose.model<IUserFamily>("UserFamily", userFamilySchema);
