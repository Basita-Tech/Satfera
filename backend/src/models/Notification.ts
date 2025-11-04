import mongoose, { Schema, Document } from "mongoose";

export interface NotificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  meta?: Record<string, any>;
  type:
    | "like"
    | "request_sent"
    | "request_received"
    | "request_accepted"
    | "request_rejected"
    | "profile_view"
    | "admin_message"
    | "system";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    meta: { type: Schema.Types.Mixed },
    type: {
      type: String,
      enum: [
        "like",
        "request_sent",
        "request_received",
        "request_accepted",
        "request_rejected",
        "profile_view",
        "admin_message",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification =
  (mongoose.models.Notification as mongoose.Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>("Notification", NotificationSchema);
