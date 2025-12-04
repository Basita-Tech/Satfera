import "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import { db } from "./config/mongo";
import type { Request, Response, NextFunction } from "express";
import { logger, morganStream } from "./lib/common/logger";
import { redisClient, connectRedis } from "./lib/redis";
import { startAllWorkers, closeAllWorkers } from "./workers";
import apiV1 from "./routes/v1";
import * as middleware from "./middleware/securityMiddleware";
import { ipBlockingMiddleware } from "./middleware/ipBlocking";
import { csrfProtection } from "./middleware/csrfProtection";

const app = express();
const swaggerDocument = YAML.load("./docs/swagger.yaml");

app.set("trust proxy", 1);

app.use(ipBlockingMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

app.use(cors(middleware.corsOptions));

app.use(middleware.securityLogger);

app.use(middleware.requestTimeoutProtection(30000));

app.use(middleware.securityHeaders);

app.use(middleware.hppProtection);

app.use(middleware.xssProtection);

app.use(middleware.suspiciousActivityDetector);

app.use(csrfProtection);

app.use(morgan("combined", { stream: morganStream }));

const PORT = parseInt(process.env.PORT || "8000", 10);

let isDbReady = false;
let isRedisReady = false;
let areWorkersReady = false;

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    ready: isDbReady && isRedisReady && areWorkersReady,
    services: {
      mongodb: isDbReady ? "ready" : "initializing",
      redis: isRedisReady ? "ready" : "initializing",
      workers: areWorkersReady ? "ready" : "initializing"
    }
  });
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Satfera API Docs"
  })
);

app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Satfera API is running",
    version: "1.0.0"
  });
});

app.use("/api/v1/", apiV1);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const sanitized = middleware.sanitizeError(err);

  res.status(sanitized.status).json({
    success: false,
    message: sanitized.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err?.stack })
  });
});

let server: any;

server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(
    `Server started (HTTP listening). Initializing background services...`
  );
});

(async function backgroundInit() {
  const startTime = process.hrtime();

  connectRedis()
    .then(() => {
      isRedisReady = true;
      logger.info("Redis connected (background).");
    })
    .catch((err) => {
      logger.error("Redis failed to connect in background:", err);
    });

  initializeDatabase()
    .then(async () => {
      isDbReady = true;
      logger.info("MongoDB connection established (background).");

      try {
        await startAllWorkers();
        areWorkersReady = true;
        logger.info("Workers started (background).");
      } catch (workerErr) {
        logger.error("Workers failed to start in background:", workerErr);
      }
    })
    .catch((err) => {
      logger.error("Background DB initialization failed:", err);
    })
    .finally(() => {
      const diff = process.hrtime(startTime);
      const ms = diff[0] * 1000 + diff[1] / 1e6;
      logger.info(
        `Background init triggered (time spent on scheduling only: ~${ms.toFixed(2)}ms)`
      );
    });
})();

async function initializeDatabase() {
  try {
    await db.connect();
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection failed:", error);

    throw error;
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
    await closeAllWorkers();

    await db.disconnect();
    logger.info("Database connection closed");

    if (redisClient.isOpen) {
      await redisClient.disconnect();
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
