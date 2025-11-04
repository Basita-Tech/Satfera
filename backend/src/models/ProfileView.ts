import mongoose from "mongoose";

const ProfileViewSchema = new mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    viewedAt: { type: Date, default: Date.now },
    weekStartDate: {
      type: Date,
      required: true,
      index: true,
    },
    weekNumber: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

ProfileViewSchema.index({ viewer: 1, candidate: 1, viewedAt: -1 });
ProfileViewSchema.index({ candidate: 1, weekStartDate: -1 });

ProfileViewSchema.index({ weekStartDate: 1 }, { expireAfterSeconds: 604800 });

export const ProfileView =
  (mongoose.models.ProfileView as mongoose.Model<any>) ||
  mongoose.model("ProfileView", ProfileViewSchema);
