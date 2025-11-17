import mongoose, { Schema } from "mongoose";

const MatchEntrySchema = new Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    score: { type: Number, required: true },
    reasons: [{ type: String }],
    scoreDetail: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const MatchesSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    matches: [MatchEntrySchema]
  },
  { timestamps: true }
);

export const Matches =
  (mongoose.models.Matches as mongoose.Model<any>) ||
  mongoose.model("Matches", MatchesSchema);
