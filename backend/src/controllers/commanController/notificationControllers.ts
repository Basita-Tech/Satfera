import { Request, Response } from "express";
import mongoose from "mongoose";
import * as notificationCache from "../../lib/redis/notificationCache";
import { logger, redisClient, safeRedisOperation } from "../../lib";
import { Notification } from "../../models";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function getAllUserNotifications(req: Request, res: Response) {
  try {
    const userId = String(req.user?.id);
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    let limit = parseInt((req.query.limit as string) || `${DEFAULT_LIMIT}`, 10);
    limit = Math.min(Math.max(1, limit), MAX_LIMIT);

    const cacheKey = notificationCache.listCacheKey(userId, page, limit);

    const cached = await safeRedisOperation(
      () => redisClient.get(cacheKey),
      "Get notifications list cache"
    );
    if (cached) {
      try {
        const payload = JSON.parse(cached);
        return res.status(200).json({ success: true, ...payload });
      } catch (err) {
        logger.warn("Failed to parse notifications cache, falling back to DB");
      }
    }

    const skip = (page - 1) * limit;

    const [total, notifications, unreadCount] = await Promise.all([
      Notification.countDocuments({ user: userId }),
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("type title message meta isRead createdAt")
        .lean(),
      Notification.countDocuments({ user: userId, isRead: false })
    ]);

    const result = {
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
        unreadCount
      }
    };

    await safeRedisOperation(
      () =>
        redisClient.setEx(
          cacheKey,
          notificationCache.LIST_TTL,
          JSON.stringify(result)
        ),
      "Set notifications list cache"
    );

    await safeRedisOperation(
      () =>
        redisClient.setEx(
          notificationCache.unreadCountCacheKey(userId),
          notificationCache.COUNT_TTL,
          String(unreadCount)
        ),
      "Set unread count cache"
    );

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    logger.error("Error fetching notifications:", {
      error: error.message,
      stack: error.stack
    });
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch notifications" });
  }
}

export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = String(req.user?.id);
    const cacheKey = notificationCache.unreadCountCacheKey(userId);

    const cached = await safeRedisOperation(
      () => redisClient.get(cacheKey),
      "Get unread count cache"
    );
    if (cached !== null && cached !== undefined) {
      const parsed = parseInt(cached, 10) || 0;
      return res
        .status(200)
        .json({ success: true, data: { unreadCount: parsed } });
    }

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    await safeRedisOperation(
      () =>
        redisClient.setEx(
          cacheKey,
          notificationCache.COUNT_TTL,
          String(unreadCount)
        ),
      "Set unread count cache"
    );

    return res.status(200).json({ success: true, data: { unreadCount } });
  } catch (error: any) {
    logger.error("Error fetching unread count:", {
      error: error.message,
      stack: error.stack
    });
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch unread count" });
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const userId = String(req.user?.id);
    const notificationId = req.params.id;

    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification id" });
    }

    const filter = { _id: notificationId, user: userId };
    const update = { $set: { isRead: true, updatedAt: new Date() } } as any;

    const prev = await Notification.findOneAndUpdate(filter, update, {
      new: true
    })
      .select("isRead")
      .lean();
    if (!prev) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    // Invalidate caches for this user
    notificationCache
      .invalidateNotificationCaches(userId)
      .catch((e) => logger.warn("Failed to invalidate notification caches", e));

    return res
      .status(200)
      .json({ success: true, data: { id: notificationId, isRead: true } });
  } catch (error: any) {
    logger.error("Error marking notification as read:", {
      error: error.message,
      stack: error.stack
    });
    return res
      .status(500)
      .json({ success: false, message: "Failed to mark notification as read" });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    const userId = String(req.user?.id);

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true, updatedAt: new Date() } }
    );

    // Invalidate caches for this user (best-effort)
    notificationCache
      .invalidateNotificationCaches(userId)
      .catch((e) => logger.warn("Failed to invalidate notification caches", e));

    return res.status(200).json({
      success: true,
      data: { modifiedCount: (result as any).modifiedCount || 0 }
    });
  } catch (error: any) {
    logger.error("Error marking all notifications as read:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read"
    });
  }
}
