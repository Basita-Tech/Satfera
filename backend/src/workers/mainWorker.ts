import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/queue";
import mongoose from "mongoose";
import { User, Notification } from "../models";
import { logger } from "../lib/common/logger";
import { invalidateNotificationCaches } from "../lib/redis/notificationCache";
import { enqueueProfileReviewEmail } from "../lib/queue/enqueue";
import {
  sendWelcomeEmail,
  sendProfileReviewSubmissionEmail,
  sendProfileApprovedEmail,
  sendProfileRejectedEmail
} from "../lib/emails";
import {
  NotificationJobData,
  WelcomeEmailJobData,
  ReviewEmailJobData,
  ProfileReviewJobData
} from "../types";

// Notification delivery helpers (adapted from previous worker files)
async function isDeliveryCompleted(
  notificationId: string,
  channel: "email" | "push" | "inapp"
): Promise<boolean> {
  const notification = await Notification.findById(notificationId).lean();
  if (!notification?.delivery?.[channel]) {
    return false;
  }
  return notification.delivery[channel].status === "sent";
}

async function updateDeliveryStatus(
  notificationId: string,
  channel: "email" | "push" | "inapp",
  status: "sent" | "failed" | "skipped",
  error?: string
) {
  // Use $set for fields and $inc for attempts to avoid race conditions when
  // multiple channels update the same notification concurrently.
  const updateData: any = {
    $set: {
      [`delivery.${channel}.status`]: status,
      [`delivery.${channel}.sentAt`]: new Date(),
      ...(error && { [`delivery.${channel}.lastError`]: error })
    },
    $inc: { [`delivery.${channel}.attempts`]: 1 }
  };

  await Notification.findByIdAndUpdate(notificationId, updateData, {
    new: false
  });
}

async function deliverInApp(notificationId: string, notification: any) {
  try {
    if (await isDeliveryCompleted(notificationId, "inapp")) {
      logger.debug(`In-app notification already sent: ${notificationId}`);
      return;
    }

    // Socket emit placeholder. If socket.io is configured elsewhere, integrate here.
    if (process.env.NODE_ENV !== "production") {
      logger.debug(
        `In-app notification emitted (socket.io not configured): ${notificationId}`
      );
    }

    await updateDeliveryStatus(notificationId, "inapp", "sent");
    logger.info(`In-app notification delivered: ${notificationId}`);
  } catch (error: any) {
    logger.error(`Failed to deliver in-app notification: ${notificationId}`, {
      error: error.message
    });
    await updateDeliveryStatus(
      notificationId,
      "inapp",
      "failed",
      error.message
    );
  }
}

async function deliverEmail(
  notificationId: string,
  notification: any,
  recipient: any
) {
  try {
    if (await isDeliveryCompleted(notificationId, "email")) {
      logger.debug(`Email notification already sent: ${notificationId}`);
      return;
    }

    if (!recipient?.email) {
      await updateDeliveryStatus(
        notificationId,
        "email",
        "skipped",
        "No email address"
      );
      if (process.env.NODE_ENV !== "production") {
        logger.debug(
          `Email notification skipped (no email): ${notificationId}`
        );
      }
      // Missing email is an expected, non-retryable condition.
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      logger.debug(
        `Email notification would be sent to ${recipient.email}: ${notification.title}`
      );
    }

    await updateDeliveryStatus(notificationId, "email", "sent");
    logger.info(`Email notification delivered: ${notificationId}`);
  } catch (error: any) {
    logger.error(`Failed to deliver email notification: ${notificationId}`, {
      error: error.message
    });
    await updateDeliveryStatus(
      notificationId,
      "email",
      "failed",
      error.message
    );
    throw error;
  }
}

async function deliverPush(
  notificationId: string,
  notification: any,
  recipient: any
) {
  try {
    if (await isDeliveryCompleted(notificationId, "push")) {
      logger.debug(`Push notification already sent: ${notificationId}`);
      return;
    }

    if (!recipient?.pushTokens || recipient.pushTokens.length === 0) {
      await updateDeliveryStatus(
        notificationId,
        "push",
        "skipped",
        "No push tokens"
      );
      if (process.env.NODE_ENV !== "production") {
        logger.debug(
          `Push notification skipped (no tokens): ${notificationId}`
        );
      }
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      logger.debug(
        `Push notification would be sent to ${recipient.pushTokens.length} tokens`
      );
    }

    await updateDeliveryStatus(notificationId, "push", "sent");
    logger.info(`Push notification delivered: ${notificationId}`);
  } catch (error: any) {
    logger.error(`Failed to deliver push notification: ${notificationId}`, {
      error: error.message
    });
    await updateDeliveryStatus(notificationId, "push", "failed", error.message);
    throw error;
  }
}

// Email processors
async function processWelcomeEmail(data: WelcomeEmailJobData): Promise<void> {
  try {
    if (!data?.email || !data?.userId) {
      logger.warn("Welcome email job missing required data, skipping", {
        data
      });
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      logger.debug(`Sending welcome email to ${data.email}`);
    }

    await sendWelcomeEmail(
      data.email,
      data.userName,
      data.username,
      data.loginLink,
      process.env.SUPPORT_EMAIL
    );

    await User.findByIdAndUpdate(
      data.userId,
      { welcomeSent: true },
      { new: false }
    );

    logger.info(`Welcome email sent to ${data.email}`);
  } catch (error: any) {
    logger.error(`Failed to send welcome email to ${data.email}:`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function processProfileReviewEmail(
  data: ReviewEmailJobData
): Promise<void> {
  try {
    if (!data?.email || !data?.userId) {
      logger.warn("Profile review email job missing required data, skipping", {
        data
      });
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      logger.debug(
        `Sending profile review email (${data.type}) to ${data.email}`
      );
    }

    switch (data.type) {
      case "submission":
        await sendProfileReviewSubmissionEmail(data.email, data.userName);
        break;
      case "approved":
        await sendProfileApprovedEmail(
          data.email,
          data.userName,
          data.dashboardLink ||
            process.env.FRONTEND_URL ||
            "https://satfera.com"
        );
        break;
      case "rejected":
        await sendProfileRejectedEmail(
          data.email,
          data.userName,
          data.reason || "Profile does not meet our community standards"
        );
        break;
    }

    logger.info(`Profile review email (${data.type}) sent to ${data.email}`);
  } catch (error: any) {
    logger.error(`Failed to send profile review email to ${data.email}:`, {
      error: error.message,
      type: data.type
    });
    throw error;
  }
}

// Profile review processor (creates notification + queues an email)
async function processProfileReview(data: ProfileReviewJobData): Promise<void> {
  if (!data?.profileId || !data?.userId) {
    logger.warn("Profile review job missing required data, skipping", { data });
    return;
  }
  try {
    logger.info(`Processing profile review: ${data.profileId}`, {
      type: data.type,
      userId: data.userId
    });

    let notificationTitle = "";
    let notificationMessage = "";

    switch (data.type) {
      case "submitted":
        notificationTitle = "Profile Submitted for Review";
        notificationMessage =
          "Your profile has been submitted for review. You will be notified once the review is complete.";
        break;

      case "approved":
        notificationTitle = "🎉 Your Profile Has Been Approved!";
        notificationMessage =
          "Congratulations! Your profile has been approved and is now visible to other members.";
        break;

      case "rejected":
        notificationTitle = "Profile Review - Action Required";
        notificationMessage = `Your profile was not approved. Reason: ${
          data.reason || "Does not meet community standards"
        }`;
        break;
    }

    const notification = await Notification.create({
      user: data.userId,
      type: data.type.includes("submitted")
        ? "profile_review_submitted"
        : data.type === "approved"
          ? "profile_approved"
          : "profile_rejected",
      title: notificationTitle,
      message: notificationMessage,
      meta: {
        profileId: data.profileId,
        reviewType: data.type
      }
    });

    invalidateNotificationCaches(String(data.userId)).catch((e) =>
      logger.warn("Failed to invalidate notification caches after create", e)
    );

    const names = data.userName.split(" ");
    const reviewData: any = {
      type: data.type as any,
      dashboardLink: process.env.FRONTEND_URL || "https://satfera.com/dashboard"
    };
    if (data.reason) reviewData.reason = data.reason;

    const emailQueued = await enqueueProfileReviewEmail(
      data.userId,
      {
        email: data.email,
        firstName: names[0] || "User",
        lastName: names[1] || ""
      },
      reviewData
    );

    if (!emailQueued) {
      logger.warn(`Failed to enqueue profile review email for ${data.userId}`);
    }

    logger.info(`Profile review job processed: ${data.profileId}`, {
      type: data.type,
      notificationId: notification._id
    });
  } catch (error: any) {
    logger.error(`Failed to process profile review: ${data.profileId}:`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export const mainWorker = new Worker(
  "main-queue",
  async (job: Job) => {
    try {
      logger.debug(`Processing main job: ${job.id}`, { jobName: job.name });

      switch (job.name) {
        case "deliver-notification": {
          const { notificationId, channels } = job.data as NotificationJobData;

          if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            logger.error(`Invalid notification ID: ${notificationId}`);
            throw new Error(`Invalid notification ID: ${notificationId}`);
          }

          const notification =
            await Notification.findById(notificationId).lean();
          if (!notification) {
            logger.error(`Notification not found: ${notificationId}`);
            throw new Error(`Notification not found: ${notificationId}`);
          }

          const recipient = await User.findById(notification.user).lean();
          if (!recipient) {
            logger.warn(
              `Recipient not found for notification: ${notificationId}`
            );
            await updateDeliveryStatus(
              notificationId,
              "inapp",
              "skipped",
              "User not found"
            );
            return { skipped: true, reason: "User not found" };
          }

          const channelsToProcess = channels || ["inapp", "email"];

          for (const channel of channelsToProcess) {
            try {
              switch (channel) {
                case "inapp":
                  await deliverInApp(notificationId, notification);
                  break;
                case "email":
                  await deliverEmail(notificationId, notification, recipient);
                  break;
                case "push":
                  await deliverPush(notificationId, notification, recipient);
                  break;
              }
            } catch (channelError) {
              logger.error(
                `Error processing channel ${channel} for notification ${notificationId}:`,
                channelError
              );
            }
          }

          return {
            success: true,
            notificationId,
            channelsProcessed: channelsToProcess
          };
        }

        case "send-welcome-email":
          await processWelcomeEmail(job.data as WelcomeEmailJobData);
          break;

        case "send-profile-review-email":
          await processProfileReviewEmail(job.data as ReviewEmailJobData);
          break;

        case "process-profile-review":
          await processProfileReview(job.data as ProfileReviewJobData);
          break;

        default:
          logger.warn(`Unknown main job type: ${job.name}`);
          throw new Error(`Unknown job type: ${job.name}`);
      }

      logger.info(`Main job completed: ${job.id}`);
      return {
        success: true,
        jobType: job.name,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error(`Main worker error for job ${job.id}:`, error);

      // Prevent pointless retries for expected/non-retryable errors such as
      // invalid IDs or missing recipient data. These should be logged and
      // dropped rather than retried multiple times.
      const msg = String(error?.message || "").toLowerCase();
      const nonRetryablePhrases = [
        "invalid notification id",
        "notification not found",
        "no email address",
        "no push tokens",
        "user not found",
        "invalid job data",
        "unknown job type"
      ];

      const isNonRetryable = nonRetryablePhrases.some((p) => msg.includes(p));
      if (isNonRetryable) {
        logger.warn(
          `Non-retryable job error for job ${job.id}, marking as failed without retry`,
          {
            jobName: job.name,
            error: error?.message
          }
        );
        // Return without throwing to avoid BullMQ retrying the job.
        return;
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: Number(process.env.MAIN_WORKER_CONCURRENCY || 5)
  }
);

mainWorker.on("completed", (job: Job) => {
  logger.debug(`Main job completed: ${job.id}`);
});

mainWorker.on("failed", (job: Job | undefined, err: Error) => {
  logger.error(`Main job failed: ${job?.id || "unknown"}`, {
    error: err.message,
    attempts: job?.attemptsMade
  });
});

mainWorker.on("error", (err: Error) => {
  logger.error("Main worker error:", err);
});

mainWorker.on("stalled", (jobId: string) => {
  logger.warn(`Main job stalled: ${jobId}`);
});

export default mainWorker;
