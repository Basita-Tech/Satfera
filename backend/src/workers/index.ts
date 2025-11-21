import mainWorker from "./mainWorker";
import { logger } from "../lib/common/logger";
import { closeQueues } from "../lib/queue";
import mongoose from "mongoose";
const workers = [mainWorker];

export async function startAllWorkers() {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not ready. Worker startup aborted.");
    }

    logger.info("Starting all BullMQ workers...");
    for (const worker of workers) {
      await worker.waitUntilReady();
      logger.info(`✓ ${worker.name} worker ready`);
    }

    logger.info(`✓ All ${workers.length} workers started successfully`);
    return true;
  } catch (error) {
    logger.error("Failed to start workers:", error);
    throw error;
  }
}

export async function closeAllWorkers() {
  try {
    logger.info("Closing all BullMQ workers...");

    const closePromises = workers.map((worker) =>
      worker
        .close()
        .then(() => logger.info(`✓ ${worker.name} worker closed`))
        .catch((err) =>
          logger.error(`Failed to close ${worker.name} worker:`, err)
        )
    );

    await Promise.allSettled(closePromises);

    await closeQueues();

    logger.info("All workers closed successfully");
    return true;
  } catch (error) {
    logger.error("Error closing workers:", error);
    throw error;
  }
}

export async function getWorkersStatus() {
  try {
    const status = await Promise.all(
      workers.map(async (worker) => ({
        name: worker.name,
        isRunning: worker.isRunning(),
        isPaused: worker.isPaused(),
        concurrency: worker.opts.concurrency
      }))
    );

    return status;
  } catch (error) {
    logger.error("Error getting workers status:", error);
    return null;
  }
}

export default { startAllWorkers, closeAllWorkers, getWorkersStatus };
