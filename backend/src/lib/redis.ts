import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > MAX_RETRIES) {
        console.error(
          `Redis: Max retries (${MAX_RETRIES}) reached. Giving up.`
        );
        return new Error("Redis connection failed after maximum retries");
      }
      const delay = Math.min(retries * 1000, RETRY_DELAY);
      console.log(
        `Redis: Reconnecting in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
      );
      return delay;
    },
    connectTimeout: 10000,
  },
});

redisClient.on("connect", () => {
  console.log("Redis: Connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis: Connected and ready");
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err.message || err);
});

redisClient.on("reconnecting", () => {
  console.log("Redis: Reconnecting...");
});

redisClient.on("end", () => {
  console.log("Redis: Connection closed");
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
    console.error(
      "Redis: Initial connection failed:",
      error.message || error
    );
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
    console.error(`${operationName} failed:`, error.message || error);

    try {
      if (!redisClient.isOpen) {
        await connectRedis();
        return await operation();
      }
    } catch (retryError: any) {
      console.error(
        `${operationName} retry failed:`,
        retryError.message || retryError
      );
    }
    return null;
  }
}

connectRedis().catch((err) => {
  console.error(
    "Redis: Failed to establish initial connection:",
    err.message || err
  );
  console.log(
    "Redis: Application will continue, but OTP features may be limited"
  );
});

if (typeof process !== "undefined" && process && process.once) {
  process.once("SIGINT", async () => {
    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
        console.log("Redis: Disconnected gracefully");
      }
    } catch (e) {
      console.error("Redis: Error during graceful shutdown");
    }
  });
}
