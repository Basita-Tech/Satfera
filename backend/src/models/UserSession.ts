import mongoose, { Schema, Document } from "mongoose";

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  jti: string;
  fingerprint?: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
    userAgent: string;
  };
  ipAddress: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
    timezone?: string;
  };
  loginAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
  logoutAt?: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      index: true
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    deviceInfo: {
      browser: { type: String, required: true },
      os: { type: String, required: true },
      device: { type: String, required: true },
      userAgent: { type: String, required: true }
    },
    fingerprint: { type: String },
    ipAddress: {
      type: String,
      required: true,
      index: true
    },
    location: {
      city: String,
      country: String,
      region: String,
      timezone: String
    },
    loginAt: {
      type: Date,
      default: Date.now
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    logoutAt: Date
  },
  {
    timestamps: true
  }
);

UserSessionSchema.index({ userId: 1, isActive: 1 });

UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserSession = mongoose.model<IUserSession>(
  "UserSession",
  UserSessionSchema
);
