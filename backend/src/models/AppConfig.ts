import mongoose, { Schema, Document } from "mongoose";

export interface IAppConfig extends Document {
  key: string;
  value: any;
  description?: string;
}

const appConfigSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String }
  },
  { timestamps: true }
);

export const AppConfig: mongoose.Model<IAppConfig> =
  (mongoose.models.AppConfig as mongoose.Model<IAppConfig>) ||
  mongoose.model<IAppConfig>("AppConfig", appConfigSchema);

export default AppConfig;
