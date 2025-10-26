import mongoose, { ConnectOptions } from "mongoose";
import { EventEmitter } from "events";

class DatabaseConnection extends EventEmitter {
  private isConnected: boolean = false;

  public constructor() {
    super();
  }

  public async connect(): Promise<void> {
    if (this.isConnected || mongoose.connection.readyState === 1) {
      this.isConnected = true;
      return;
    }

    try {
      const mongoUrl =
        process.env.MONGO_URI || "mongodb://localhost:27017/basita";

      const options: ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      } as ConnectOptions;

      await mongoose.connect(mongoUrl, options);

      this.isConnected = true;

      console.log("🍃 MongoDB connected successfully");
      console.log(`📍 Database: ${mongoose.connection.name}`);

      mongoose.connection.on("error", (error: any) => {
        console.error("❌ MongoDB connection error:", error?.message || error);
        this.emit("error", error);
      });

      mongoose.connection.on("disconnected", () => {
        console.log("⚠️ MongoDB disconnected");
        this.isConnected = false;
        this.emit("disconnected");
      });
    } catch (error: any) {
      console.error("❌ MongoDB connection failed:", error?.message || error);
      throw new Error(error?.message || "MongoDB connection failed");
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected && mongoose.connection.readyState !== 1) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("🔌 MongoDB disconnected gracefully");
      this.emit("disconnected");
    } catch (error: any) {
      console.error(
        "❌ Error disconnecting from MongoDB:",
        error?.message || error
      );
      throw new Error(error?.message || "Error disconnecting from MongoDB");
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

if (typeof process !== "undefined" && process && process.once) {
  process.once("SIGINT", async () => {
    try {
      await db.disconnect();
    } catch (e) {}
    process.exit(0);
  });
}

export default mongoose;
