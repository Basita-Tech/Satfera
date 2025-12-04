import mongoose, { Schema, Document } from "mongoose";

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  isVerified: boolean;
  photos: {
    closerPhoto: {
      url: string;
      uploadedAt: Date;
      visibility: "public";
    };
    personalPhotos: {
      url: string;
      uploadedAt: Date;
      visibility: "connectionOnly";
    }[];
    familyPhoto: {
      url: string;
      uploadedAt: Date;
      visibility: "connectionOnly";
    };
    otherPhotos: {
      url: string;
      title: string;
      uploadedAt: Date;
      visibility: "connectionOnly";
    }[];
  };
  governmentIdImage: {
    url: string;
    uploadedAt: Date;
    verificationStatus: "pending" | "verified" | "rejected";
    visibility: "adminOnly";
  };
  isProfileApproved: boolean;
  isVisible: boolean;
  privacy: {
    allowProfileViewOnRequest: boolean;
    showPhotosToConnectionsOnly: boolean;
  };
  settings: {
    notifyOnNewConnectionRequest: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
  };
  favoriteProfiles: mongoose.Types.ObjectId[];
  compareProfiles: mongoose.Types.ObjectId[];
  accountType: "free" | "premium" | "gold";
  ProfileViewed: number;
  profileReviewStatus: "pending" | "approved" | "rejected";
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
}

const ProfileSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    isVerified: { type: Boolean, default: true },

    photos: {
      closerPhoto: {
        url: String,
        uploadedAt: Date,
        visibility: { type: String, enum: ["public"], default: "public" }
      },
      personalPhotos: [
        {
          url: String,
          uploadedAt: Date,
          visibility: {
            type: String,
            enum: ["connectionOnly"],
            default: "connectionOnly"
          }
        }
      ],
      familyPhoto: {
        url: String,
        uploadedAt: Date,
        visibility: {
          type: String,
          enum: ["connectionOnly"],
          default: "connectionOnly"
        }
      },
      otherPhotos: [
        {
          url: String,
          title: String,
          uploadedAt: Date,
          visibility: {
            type: String,
            enum: ["connectionOnly"],
            default: "connectionOnly"
          }
        }
      ]
    },
    governmentIdImage: {
      url: String,
      uploadedAt: Date,
      verificationStatus: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending"
      },
      visibility: { type: String, enum: ["adminOnly"], default: "adminOnly" }
    },

    isProfileApproved: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
    privacy: {
      allowProfileViewOnRequest: { type: Boolean, default: false },
      showPhotosToConnectionsOnly: { type: Boolean, default: true }
    },
    settings: {
      receiveConnectionRequests: { type: Boolean, default: true },
      notifyOnNewConnectionRequest: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false }
    },
    favoriteProfiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    compareProfiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    accountType: {
      type: String,
      enum: ["free", "premium"],
      default: "free"
    },
    ProfileViewed: { type: Number, default: 0 },
    profileReviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"]
    },
    reviewedAt: { type: Date },
    reviewNotes: { type: String }
  },
  { timestamps: true }
);

export const Profile =
  (mongoose.models.Profile as mongoose.Model<IProfile>) ||
  mongoose.model<IProfile>("Profile", ProfileSchema);
