import mongoose, { Schema, Document, Model } from "mongoose";

export enum SupportTicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed"
}

export interface ISupportTicket extends Document {
  userId: mongoose.Types.ObjectId;
  ticketId: string;
  name: string;
  userCustomId?: string;
  email: string;
  phone?: string;
  subject: string;
  description?: string;
  category: string;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ticketId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    userCustomId: { type: String },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(SupportTicketStatus),
      default: SupportTicketStatus.OPEN
    }
  },
  { timestamps: true }
);

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });
supportTicketSchema.index({ category: 1, createdAt: -1 });

export const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>("SupportTicket", supportTicketSchema);
