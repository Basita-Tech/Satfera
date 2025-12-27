import mongoose, { Schema, Document } from "mongoose";

export interface Payment extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  months: number;
  planName?: string;
  provider?: string;
  transactionId?: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<Payment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    months: { type: Number, required: true },
    planName: { type: String },
    provider: { type: String },
    transactionId: { type: String }
  },
  { timestamps: true }
);

export const Payment =
  (mongoose.models.Payment as mongoose.Model<Payment>) ||
  mongoose.model<Payment>("Payment", PaymentSchema);
