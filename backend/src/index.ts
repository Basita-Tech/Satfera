import "./config/env";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { db } from "./config/mongo";
import type { Request, Response, NextFunction } from "express";
import authRouter from "./routes/authRouter";
import userPersonalRouter from "./routes/userPersonal";
import { logger, morganStream } from "./config/logger";

import { redisClient } from "./lib/redis";

const app = express();

// Trust proxy - required for Vercel/serverless and rate limiting
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json());
app.use(morgan("combined", { stream: morganStream }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Rate limiting
// app.use("/api/", apiLimiter);

const PORT = parseInt(process.env.PORT || "8000", 10);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Satfera API is running",
    version: "1.0.0",
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user-personal", userPersonalRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", err);

  const status = err?.status || err?.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? err?.status < 500
        ? err?.message
        : "Internal Server Error"
      : err?.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err?.stack }),
  });
});

async function initializeDatabase() {
  try {
    await db.connect();
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

let server: any;

async function startServer() {
  try {
    await initializeDatabase();

    server = app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Security middleware enabled`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
    });
  }

  try {
    await db.disconnect();
    logger.info("Database connection closed");

    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info("Redis connection closed");
    }

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

startServer();
