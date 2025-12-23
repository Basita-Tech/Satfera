import mongoose, { Schema, Document, Model } from "mongoose";

export enum MessageSender {
  USER = "user",
  ADMIN = "admin"
}

export interface ISupportMessage extends Document {
  ticketId: mongoose.Types.ObjectId;
  text: string;
  sender: MessageSender;
  senderId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const supportMessageSchema: Schema = new Schema(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "SupportTicket",
      required: true
    },
    text: { type: String, required: true, maxlength: 2000 },
    sender: {
      type: String,
      enum: Object.values(MessageSender),
      required: true
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

supportMessageSchema.index({ ticketId: 1, createdAt: 1 });

export const SupportMessage: Model<ISupportMessage> =
  mongoose.models.SupportMessage ||
  mongoose.model<ISupportMessage>("SupportMessage", supportMessageSchema);
