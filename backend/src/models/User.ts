import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: { type: string; enum: ["male", "female", "other"] };
  role: { type: string; enum: ["user", "admin"] };
  phoneNumber?: string;
  password: string;
  isActive: boolean;
  email: string;
  isEmailLoginEnabled: boolean;
  isMobileLoginEnabled: boolean;
  for_Profile?: "myself" | "son" | "daughter" | "brother" | "sister" | "friend";
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  welcomeSent?: boolean;
  createdAt: Date;
  dateOfBirth?: Date;
  lastLoginAt: Date;
  isOnboardingCompleted: boolean;
  completedSteps?: string[];
  termsAndConditionsAccepted: boolean;
}

const userSchema: Schema = new Schema(
  {
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    phoneNumber: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    email: { type: String, required: true, unique: true },
    isEmailLoginEnabled: { type: Boolean, default: true },
    isMobileLoginEnabled: { type: Boolean, default: false },
    for_Profile: {
      type: String,
      enum: ["myself", "son", "daughter", "brother", "sister", "friend"],
      required: true,
      default: "myself"
    },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    welcomeSent: { type: Boolean, default: false },
    dateOfBirth: { type: Date },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    isOnboardingCompleted: { type: Boolean, default: false },
    completedSteps: { type: [String], default: [] },
    termsAndConditionsAccepted: { type: Boolean, default: false },
    customId: { type: String, unique: true, sparse: true }
  },
  { timestamps: true }
);

userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ phoneNumber: 1, isActive: 1 });
userSchema.index({ email: 1, isEmailLoginEnabled: 1 });
userSchema.index({ phoneNumber: 1, isMobileLoginEnabled: 1 });

userSchema.pre("save", function (next) {
  try {
    if ((this as any).isModified("email") && (this as any).email) {
      (this as any).email = (this as any).email.toLowerCase().trim();
    }
    if ((this as any).isModified("phoneNumber") && (this as any).phoneNumber) {
      (this as any).phoneNumber = (this as any).phoneNumber.toString().trim();
    }
  } catch (error) {
    return next(error as any);
  }
  next();
});

function removeSensitive(doc: any, ret: any) {
  if (ret) {
    delete ret.password;
    delete ret.__v;
    delete ret.welcomeSent;

    if (ret._id) {
      ret.id = String(ret._id);
      delete ret._id;
    }
  }
}

userSchema.set("toJSON", {
  transform: removeSensitive
});

userSchema.set("toObject", {
  transform: removeSensitive
});

userSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

export const User: mongoose.Model<IUser> =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);
