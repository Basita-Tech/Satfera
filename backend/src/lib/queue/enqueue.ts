import mongoose from "mongoose";
import { Notification } from "../../models";
import { mainQueue } from "./index";
import { logger } from "../common/logger";
import pLimit from "p-limit";
import * as types from "../../types";

export async function enqueueNotification(
  notificationId: string | mongoose.Types.ObjectId,
  channels: ("email" | "push" | "inapp")[] = ["inapp", "email"]
): Promise<boolean> {
  try {
    const id = String(notificationId);

    const notification = await Notification.findById(id).lean();
    if (!notification) {
      logger.warn(`Notification not found: ${id}`);
      return false;
    }

    if (notification.enqueueFailed) {
      logger.debug(`Retrying failed notification enqueue: ${id}`);
    }

    const jobData: types.NotificationJobData = {
      notificationId: id,
      channels
    };

    await mainQueue.add("deliver-notification", jobData, {
      jobId: `notif-${id}`
    });

    await Notification.findByIdAndUpdate(
      id,
      { enqueueFailed: false },
      { new: false }
    );

    logger.debug(
      `Notification enqueued: ${id} | channels: ${channels.join(",")}`
    );
    return true;
  } catch (error: any) {
    logger.error("Failed to enqueue notification:", {
      error: error.message,
      notificationId: notificationId
    });

    try {
      await Notification.findByIdAndUpdate(
        notificationId,
        { enqueueFailed: true },
        { new: false }
      );
    } catch (updateErr) {
      logger.error("Failed to mark notification as enqueue failed:", updateErr);
    }

    return false;
  }
}

export async function enqueueNotificationsBulk(
  notificationIds: (string | mongoose.Types.ObjectId)[],
  channels: ("email" | "push" | "inapp")[] = ["inapp", "email"]
): Promise<number> {
  try {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return 0;
    }

    const jobs = [] as any[];

    for (const nid of notificationIds) {
      const id = String(nid);

      const jobData = {
        notificationId: id,
        channels
      };

      jobs.push({
        name: "deliver-notification",
        data: jobData,
        opts: {
          jobId: `notif-${id}`,
          deduplication: { id: `notif-${id}` }
        }
      });
    }

    const added = await mainQueue.addBulk(jobs as any[]);

    logger.debug(`Bulk enqueued ${added.length} notification jobs`);
    return added.length;
  } catch (error: any) {
    logger.error("Failed to bulk enqueue notifications:", {
      error: error.message
    });
    return 0;
  }
}

export async function enqueueWelcomeEmail(
  userId: string | mongoose.Types.ObjectId,
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    username: string;
  },
  loginLink: string
): Promise<boolean> {
  try {
    const jobData: types.WelcomeEmailJobData = {
      userId: String(userId),
      email: userData.email,
      userName: `${userData.firstName} ${userData.lastName}`,
      username: userData.username,
      loginLink
    };

    await mainQueue.add("send-welcome-email", jobData, {
      jobId: `welcome-${userId}`,
      attempts: 2
    });

    logger.debug(`Welcome email enqueued for user: ${userId}`);
    return true;
  } catch (error: any) {
    logger.error("Failed to enqueue welcome email:", {
      error: error.message,
      userId
    });
    return false;
  }
}

export async function enqueueProfileReviewEmail(
  userId: string | mongoose.Types.ObjectId,
  userData: {
    email: string;
    firstName: string;
    lastName: string;
  },
  reviewData: {
    type: "submission" | "approved" | "rejected";
    reason?: string;
    dashboardLink?: string;
  }
): Promise<boolean> {
  try {
    const jobData: types.ReviewEmailJobData = {
      userId: String(userId),
      email: userData.email,
      userName: `${userData.firstName} ${userData.lastName}`,
      type: reviewData.type,
      ...(reviewData.reason && { reason: reviewData.reason }),
      ...(reviewData.dashboardLink && {
        dashboardLink: reviewData.dashboardLink
      })
    } as types.ReviewEmailJobData;

    await mainQueue.add("send-profile-review-email", jobData, {
      jobId: `profile-review-${userId}-${reviewData.type}`
    });

    logger.debug(
      `Profile review email enqueued for user: ${userId} | type: ${reviewData.type}`
    );
    return true;
  } catch (error: any) {
    logger.error("Failed to enqueue profile review email:", {
      error: error.message,
      userId
    });
    return false;
  }
}

export async function enqueueProfileReview(
  profileId: string,
  userId: string | mongoose.Types.ObjectId,
  userData: {
    email: string;
    firstName: string;
    lastName: string;
  },
  reviewData: {
    type: "submitted" | "approved" | "rejected";
    reason?: string;
  }
): Promise<boolean> {
  try {
    const jobData: types.ProfileReviewJobData = {
      profileId,
      userId: String(userId),
      email: userData.email,
      userName: `${userData.firstName} ${userData.lastName}`,
      type: reviewData.type,
      ...(reviewData.reason && { reason: reviewData.reason })
    } as types.ProfileReviewJobData;

    await mainQueue.add("process-profile-review", jobData, {
      jobId: `review-${profileId}-${reviewData.type}`
    });

    logger.debug(
      `Profile review enqueued: ${profileId} | type: ${reviewData.type}`
    );
    return true;
  } catch (error: any) {
    logger.error("Failed to enqueue profile review:", {
      error: error.message,
      profileId,
      userId
    });
    return false;
  }
}

export async function retryFailedEnqueues(): Promise<number> {
  try {
    const failedNotifications = await Notification.find({
      enqueueFailed: true,
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    })
      .select("_id")
      .lean()
      .limit(100);

    const CONCURRENCY = Number(process.env.ENQUEUE_RETRY_CONCURRENCY || 5);
    const limit = pLimit(CONCURRENCY);

    const results = await Promise.all(
      failedNotifications.map((notif) =>
        limit(() => enqueueNotification(String(notif._id)))
      )
    );

    const successCount = results.reduce((acc, r) => acc + (r ? 1 : 0), 0);

    logger.info(
      `Retry failed enqueues completed: ${successCount}/${failedNotifications.length} succeeded`
    );
    return successCount;
  } catch (error: any) {
    logger.error("Error retrying failed enqueues:", error);
    return 0;
  }
}

export async function getEnqueueMetrics() {
  try {
    const [failedCount, totalCount] = await Promise.all([
      Notification.countDocuments({ enqueueFailed: true }),
      Notification.countDocuments()
    ]);

    return {
      totalNotifications: totalCount,
      failedEnqueues: failedCount,
      successRate: (((totalCount - failedCount) / totalCount) * 100).toFixed(2)
    };
  } catch (error: any) {
    logger.error("Error getting enqueue metrics:", error);
    return null;
  }
}
