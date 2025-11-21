import mongoose, { Schema, Document } from "mongoose";

export interface ConnectionRequestDocument extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected" | "withdrawn" | "blocked";
  actionedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionRequestSchema = new Schema<ConnectionRequestDocument>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked", "withdrawn"],
      default: null,
      index: true
    },
    actionedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

ConnectionRequestSchema.index(
  { sender: 1, receiver: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const ConnectionRequest =
  (mongoose.models
    .ConnectionRequest as mongoose.Model<ConnectionRequestDocument>) ||
  mongoose.model<ConnectionRequestDocument>(
    "ConnectionRequest",
    ConnectionRequestSchema
  );
