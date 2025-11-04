import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isVerified: { type: Boolean, default: false },

    photos: {
      closerPhoto: {
        url: String,
        uploadedAt: Date,
        visibility: { type: String, enum: ["public"], default: "public" },
      },
      personalPhotos: [
        {
          url: String,
          uploadedAt: Date,
          visibility: {
            type: String,
            enum: ["connectionOnly"],
            default: "connectionOnly",
          },
        },
      ],
      familyPhoto: {
        url: String,
        uploadedAt: Date,
        visibility: {
          type: String,
          enum: ["connectionOnly"],
          default: "connectionOnly",
        },
      },
      otherPhotos: [
        {
          url: String,
          title: String,
          uploadedAt: Date,
          visibility: {
            type: String,
            enum: ["connectionOnly"],
            default: "connectionOnly",
          },
        },
      ],
    },

    governmentIdImage: {
      url: String,
      uploadedAt: Date,
      verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending",
      },
      visibility: { type: String, enum: ["adminOnly"], default: "adminOnly" },
    },

    isProfileApproved: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    privacy: {
      allowProfileViewOnRequest: { type: Boolean, default: false },
      showPhotosToConnectionsOnly: { type: Boolean, default: true },
    },
    settings: {
      receiveConnectionRequests: { type: Boolean, default: true },
      notifyOnNewConnectionRequest: { type: Boolean, default: true },
      visibleTo: {
        type: String,
        enum: ["everyone", "matchesOnly", "noOne", "connectionsOnly"],
        default: "everyone",
      },
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
    favoriteProfiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    accountType: {
      type: String,
      enum: ["free", "premium", "gold"],
      default: "free",
    },
    ProfileViewed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Profile =
  (mongoose.models.Profile as mongoose.Model<any>) ||
  mongoose.model("Profile", ProfileSchema);
