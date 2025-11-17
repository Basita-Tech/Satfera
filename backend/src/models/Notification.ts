import mongoose, { Schema, Document } from "mongoose";

export interface DeliveryChannel {
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt?: Date;
  attempts: number;
  lastError?: string;
}

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
    | "system"
    | "welcome"
    | "profile_review_submitted"
    | "profile_approved"
    | "profile_rejected";
  title: string;
  message: string;
  isRead: boolean;
  delivery?: {
    email?: DeliveryChannel;
    push?: DeliveryChannel;
    inapp?: DeliveryChannel;
  };
  enqueueFailed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryChannelSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending"
    },
    sentAt: Date,
    attempts: { type: Number, default: 0, min: 0 },
    lastError: String
  },
  { _id: false }
);

const NotificationSchema = new Schema<NotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true
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
        "welcome",
        "profile_review_submitted",
        "profile_approved",
        "profile_rejected"
      ],
      required: true,
      index: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    delivery: {
      email: DeliveryChannelSchema,
      push: DeliveryChannelSchema,
      inapp: DeliveryChannelSchema
    },
    enqueueFailed: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ enqueueFailed: 1, createdAt: 1 });
NotificationSchema.index({ "delivery.email.status": 1, createdAt: -1 });

export const Notification =
  (mongoose.models.Notification as mongoose.Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>("Notification", NotificationSchema);
