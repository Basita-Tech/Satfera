import mongoose, { Document, Schema } from "mongoose";

export interface IReports extends Document {
    userId: mongoose.Types.ObjectId;
    reportedToUserId: mongoose.Types.ObjectId;
    reporterUserDetails?: {
        firstName: string;
        lastName: string;
        profilePicture: string;
        occupation: string;
    }
    reportedToUserDetails?: {
        firstName: string;
        lastName: string;
        profilePicture: string;
        occupation: string;
    }
    reportType: string;
    reportReason: string;
    reportDescription: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
}

const UserSnapshotSchema = new Schema(
    {
        firstName: String,
        lastName: String,
        profilePicture: String,
        occupation: String
    },
    { _id: false }
);

const ReportsSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        reportedToUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        reporterUserDetails: {
            type: UserSnapshotSchema
        },

        reportedToUserDetails: {
            type: UserSnapshotSchema
        },
        reportType: {
            type: String,
            enum: ["spam", "abuse", "hate", "other"],
            default: "other"
        },
        reportReason: {
            type: String,
            required: true
        },
        reportDescription: {
            type: String,
            required: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["pending", "resolved", "rejected"],
            default: "pending"
        }
    }
);

ReportsSchema.index({ userId: 1, reportedToUserId: 1 });

export const Reports =
    (mongoose.models.Reports as mongoose.Model<IReports>) ||
    mongoose.model<IReports>("Reports", ReportsSchema);
