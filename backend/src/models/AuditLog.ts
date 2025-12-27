import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId | string;
  adminName: string;
  adminEmail?: string;
  action: string;
  targetType?: string;
  targetDisplayName?: string;
  targetId?: mongoose.Types.ObjectId | string;
  details?: any;
  ip?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: Date;
}

const auditSchema: Schema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, required: true },
    adminEmail: { type: String },
    action: { type: String, required: true },
    targetType: { type: String },
    targetDisplayName: { type: String },
    targetId: { type: Schema.Types.Mixed },
    details: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
    minimize: false
  }
);

auditSchema.index({ createdAt: -1 });
auditSchema.index({ adminId: 1, createdAt: -1 });
auditSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });

export const AuditLog: mongoose.Model<IAuditLog> =
  (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", auditSchema);
