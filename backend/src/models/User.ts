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
  deactivatedAt?: Date;
  deactivationReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletionReason?: string;
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
  customId?: string;
  blockedUsers?: mongoose.Types.ObjectId[];
}

const sanitizeString = (value: string): string => {
  if (!value) return value;
  return value.toString().replace(/[<>]/g, "").replace(/[\$]/g, "").trim();
};

const emailValidator = {
  validator: function (v: string) {
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return !v || emailRegex.test(v);
  },
  message: "Invalid email format"
};

const phoneValidator = {
  validator: function (v: string) {
    const phoneRegex = /^[\d\s+\-()]+$/;
    return !v || phoneRegex.test(v);
  },
  message: "Invalid phone number format"
};

const nameValidator = {
  validator: function (v: string) {
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    return !v || nameRegex.test(v);
  },
  message:
    "Invalid name format - only letters, spaces, hyphens and apostrophes allowed"
};

const userSchema: Schema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      validate: nameValidator,
      maxlength: [50, "First name cannot exceed 50 characters"],
      set: sanitizeString
    },
    middleName: {
      type: String,
      validate: nameValidator,
      maxlength: [50, "Middle name cannot exceed 50 characters"],
      set: sanitizeString
    },
    lastName: {
      type: String,
      required: true,
      validate: nameValidator,
      maxlength: [50, "Last name cannot exceed 50 characters"],
      set: sanitizeString
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female, or other"
      },
      required: true
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role must be user or admin"
      },
      default: "user"
    },
    phoneNumber: {
      type: String,
      required: true,
      validate: phoneValidator,
      maxlength: [20, "Phone number cannot exceed 20 characters"]
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters"],
      maxlength: [255, "Password hash too long"]
    },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    deactivationReason: {
      type: String,
      maxlength: [500, "Deactivation reason cannot exceed 500 characters"],
      set: sanitizeString
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletionReason: {
      type: String,
      maxlength: [500, "Deletion reason cannot exceed 500 characters"],
      set: sanitizeString
    },
    email: {
      type: String,
      required: true,
      validate: emailValidator,
      lowercase: true,
      maxlength: [255, "Email cannot exceed 255 characters"]
    },
    isEmailLoginEnabled: { type: Boolean, default: true },
    isMobileLoginEnabled: { type: Boolean, default: false },
    for_Profile: {
      type: String,
      enum: {
        values: ["myself", "son", "daughter", "brother", "sister", "friend"],
        message: "Invalid profile type"
      },
      required: true,
      default: "myself"
    },
    isEmailVerified: { type: Boolean, default: true },
    isPhoneVerified: { type: Boolean, default: false },
    welcomeSent: { type: Boolean, default: false },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (v: Date) {
          if (!v) return true;
          const eighteenYearsAgo = new Date();
          eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
          return v <= eighteenYearsAgo && v > new Date("1900-01-01");
        },
        message: "Invalid date of birth"
      }
    },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    isOnboardingCompleted: { type: Boolean, default: false },
    completedSteps: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          const allowedSteps = [
            "personal",
            "family",
            "education",
            "profession",
            "health",
            "expectation",
            "photos"
          ];
          return v.every((step) => allowedSteps.includes(step));
        },
        message: "Invalid completed step"
      }
    },
    termsAndConditionsAccepted: { type: Boolean, default: false },
    customId: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: [50, "Custom ID cannot exceed 50 characters"]
    },
    blockedUsers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
      validate: {
        validator: function (v: mongoose.Types.ObjectId[]) {
          return v.length <= 1000;
        },
        message: "Blocked users limit exceeded"
      }
    }
  },
  {
    timestamps: true,

    minimize: false,

    strict: true,

    strictQuery: true
  }
);

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
userSchema.index(
  { phoneNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
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
