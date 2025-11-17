import mongoose, { ConnectOptions } from "mongoose";
import { EventEmitter } from "events";
import { APP_CONFIG } from "../utils/constants";
import { logger } from "../lib";

class DatabaseConnection extends EventEmitter {
  private isConnected: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000;

  public constructor() {
    super();
  }

  public async connect(): Promise<void> {
    if (this.isConnected || mongoose.connection.readyState === 1) {
      this.isConnected = true;
      return;
    }

    try {
      const mongoUrl = process.env.MONGO_URI;
      if (!mongoUrl) {
        throw new Error("MONGO_URI environment variable is required");
      }

      const options: ConnectOptions = {
        maxPoolSize: APP_CONFIG.MONGO.MAX_POOL_SIZE,
        minPoolSize: APP_CONFIG.MONGO.MIN_POOL_SIZE,
        serverSelectionTimeoutMS: APP_CONFIG.MONGO.SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMS: APP_CONFIG.MONGO.SOCKET_TIMEOUT_MS,
        connectTimeoutMS: APP_CONFIG.MONGO.CONNECT_TIMEOUT_MS,
        heartbeatFrequencyMS: APP_CONFIG.MONGO.HEARTBEAT_FREQUENCY_MS,
        retryWrites: true,
        retryReads: true
      } as ConnectOptions;

      await mongoose.connect(mongoUrl, options);

      this.isConnected = true;
      this.reconnectAttempts = 0;

      this.setupEventHandlers();
    } catch (error: any) {
      logger.error("MongoDB connection failed:", error?.message || error);
      this.handleReconnection();
      throw new Error(error?.message || "MongoDB connection failed");
    }
  }

  private setupEventHandlers(): void {
    mongoose.connection.removeAllListeners("error");
    mongoose.connection.removeAllListeners("disconnected");
    mongoose.connection.removeAllListeners("reconnected");

    mongoose.connection.on("error", (error: any) => {
      logger.error("MongoDB connection error:", error?.message || error);
      this.emit("error", error);
      this.isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      this.isConnected = false;
      this.emit("disconnected");
      this.handleReconnection();
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected successfully");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit("reconnected");
    });

    mongoose.connection.on("connected", () => {
      logger.info("MongoDB connected");
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });
  }

  private handleReconnection(): void {
    if (this.reconnectTimeout) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(
        `MongoDB: Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Please check your connection.`
      );
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000); // Max 30 seconds

    logger.warn(
      `MongoDB: Attempting to reconnect in ${delay / 1000}s (attempt ${
        this.reconnectAttempts
      }/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        if (mongoose.connection.readyState === 0) {
          await this.connect();
        }
      } catch (error) {
        logger.error("MongoDB: Reconnection attempt failed");
        this.handleReconnection();
      }
    }, delay);
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected && mongoose.connection.readyState !== 1) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info("🔌 MongoDB disconnected gracefully");
      this.emit("disconnected");
    } catch (error: any) {
      logger.error(
        "Error disconnecting from MongoDB:",
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
