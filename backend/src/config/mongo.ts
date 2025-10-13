import mongoose from "mongoose";
import { EventEmitter } from "events";

import dotenv from "dotenv";
dotenv.config();

class DatabaseConnection extends EventEmitter {
  private isConnected: boolean = false;

  public constructor() {
    super();
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const mongoUrl =
        process.env.MONGODB_URI || "mongodb://localhost:27017/basita";

      await mongoose.connect(mongoUrl, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true as any,
      } as any);

      this.isConnected = true;

      console.log("🍃 MongoDB connected successfully");
      console.log(`📍 Database: ${mongoose.connection.name}`);

      mongoose.connection.on("error", (error: any) => {
        console.error("❌ MongoDB connection error:", error);
        this.emit("error", error);
      });

      mongoose.connection.on("disconnected", () => {
        console.log("⚠️ MongoDB disconnected");
        this.isConnected = false;
        this.emit("disconnected");
      });

      process.on("SIGINT", async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("🔌 MongoDB disconnected gracefully");
      this.emit("disconnected");
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error);
      throw error;
    }
  }

  public getConnection() {
    return mongoose.connection;
  }

  public isConnectionReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const db = new DatabaseConnection();
export default mongoose;
