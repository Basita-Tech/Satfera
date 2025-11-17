import { Queue, JobsOptions } from "bullmq";
import Redis from "ioredis";
import { logger } from "../common";
import { env } from "../../config";

const redisUrl = env.REDIS_URL || "";

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  enableOfflineQueue: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 5000);
    return delay;
  }
});

redisConnection.on("connect", () => {
  logger.info("BullMQ Redis connection established");
});

redisConnection.on("error", (err: any) => {
  logger.error("BullMQ Redis connection error:", err);
});

redisConnection.on("close", () => {
  logger.info("BullMQ Redis connection closed");
});

const defaultJobOptions: JobsOptions = {
  attempts: 2,
  backoff: {
    type: "exponential",
    delay: 2000
  },
  removeOnComplete: {
    age: 900
  },
  removeOnFail: {
    age: 24 * 3600
  }
};

export const mainQueue = new Queue("main-queue", {
  connection: redisConnection as any,
  defaultJobOptions: {
    ...defaultJobOptions,

    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000
    },
    priority: 50
  }
});

function setupQueueEvents() {
  mainQueue.on("error", (err: any) => {
    logger.error("Main queue error:", err);
  });
}

setupQueueEvents();

export async function closeQueues() {
  try {
    logger.info("Closing BullMQ queues...");

    await Promise.all([mainQueue.close()]);

    logger.info("BullMQ queues closed successfully");
  } catch (error) {
    logger.error("Error closing BullMQ queues:", error);
    throw error;
  }
}

export async function getQueueStats() {
  const STATS_CACHE_TTL_MS = 30 * 1000;
  (getQueueStats as any)._cache = (getQueueStats as any)._cache || {
    ts: 0,
    data: null
  };
  const cache = (getQueueStats as any)._cache;

  try {
    if (Date.now() - cache.ts < STATS_CACHE_TTL_MS && cache.data) {
      return cache.data;
    }

    const counts = await mainQueue.getJobCounts();

    const result = {
      main: counts
    };

    cache.ts = Date.now();
    cache.data = result;

    return result;
  } catch (error) {
    logger.error("Error getting queue stats:", error);
    return null;
  }
}
