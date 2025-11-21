import { createClient } from "redis";
import { APP_CONFIG } from "../../utils/constants";
import { logger } from "../common/logger";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("REDIS_URL environment variable is required");
}

const MAX_RETRIES = APP_CONFIG.REDIS.MAX_RETRIES;
const RETRY_DELAY = APP_CONFIG.REDIS.RETRY_DELAY;

export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > MAX_RETRIES) {
        logger.error(`Redis: Max retries (${MAX_RETRIES}) reached. Giving up.`);
        return new Error("Redis connection failed after maximum retries");
      }
      const delay = Math.min(retries * 1000, RETRY_DELAY);
      logger.warn(
        `Redis: Reconnecting in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
      );
      return delay;
    },
    connectTimeout: APP_CONFIG.REDIS.CONNECT_TIMEOUT
  }
});

redisClient.on("connect", () => {
  logger.info("Redis: Connecting...");
});

redisClient.on("ready", () => {
  logger.info("Redis: Connected and ready");
});

redisClient.on("error", (err) => {
  logger.error("Redis Client Error:", err.message || err);
});

redisClient.on("reconnecting", () => {
  logger.warn("Redis: Reconnecting...");
});

redisClient.on("end", () => {
  logger.info("Redis: Connection closed");
});

let isConnecting = false;

export async function connectRedis() {
  if (redisClient.isOpen) {
    return redisClient;
  }

  if (isConnecting) {
    while (isConnecting && !redisClient.isOpen) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return redisClient;
  }

  try {
    isConnecting = true;
    await redisClient.connect();
    isConnecting = false;
    return redisClient;
  } catch (error: any) {
    isConnecting = false;
    logger.error("Redis: Initial connection failed:", error.message || error);
    throw error;
  }
}

export async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  operationName: string = "Redis operation"
): Promise<T | null> {
  try {
    if (!redisClient.isOpen) {
      await connectRedis();
    }
    return await operation();
  } catch (error: any) {
    logger.error(`${operationName} failed:`, error.message || error);

    try {
      if (!redisClient.isOpen) {
        await connectRedis();
        return await operation();
      }
    } catch (retryError: any) {
      logger.error(
        `${operationName} retry failed:`,
        retryError.message || retryError
      );
    }
    return null;
  }
}

if (typeof process !== "undefined" && process && process.once) {
  process.once("SIGINT", async () => {
    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
        logger.info("Redis: Disconnected gracefully");
      }
    } catch (e) {
      logger.error("Redis: Error during graceful shutdown");
    }
  });
}

export * from "./cacheUtils";
