import mongoose, { Schema, Document } from "mongoose";

export interface IMatch extends Document {
  userId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  score: number;
  reasons: string[];
  isVisible: boolean;
  hiddenReason: "request" | "favorite" | null;
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true
    },
    reasons: [{ type: String }],
    isVisible: {
      type: Boolean,
      default: true,
      index: true
    },
    hiddenReason: {
      type: String,
      enum: ["request", "favorite", null],
      default: null
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

MatchSchema.index({ userId: 1, isVisible: 1, score: -1 });
MatchSchema.index({ userId: 1, candidateId: 1 }, { unique: true });
MatchSchema.index({ candidateId: 1, isVisible: 1 });

export const Match =
  (mongoose.models.Match as mongoose.Model<IMatch>) ||
  mongoose.model<IMatch>("Match", MatchSchema);
