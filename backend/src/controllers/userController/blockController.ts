import { Request, Response } from "express";
import {
  blockUser,
  unblockUser,
  getBlockedUsers
} from "../../services/userPersonalService/blockService";
import { logger } from "../../lib/common/logger";

export async function blockController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { customId } = req.body;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!customId)
      return res
        .status(400)
        .json({ success: false, message: "customId is required" });

    try {
      const result = await blockUser(userId, customId);
      return res.status(200).json({
        success: true,
        message: "User blocked successfully",
      });
    } catch (err: any) {
      const msg = err?.message || "Failed to block user";
      if (msg.startsWith("Cooldown")) {
        return res.status(429).json({
          success: false,
          message: "You can change block status for this profile after 24 hours"
        });
      }
      if (msg.startsWith("AlreadyBlocked")) {
        return res.status(400).json({
          success: false,
          message: "User is already in your blocked list"
        });
      }
      if (msg === "Target user not found") {
        return res
          .status(404)
          .json({ success: false, message: "Target user not found" });
      }
      if (msg === "Cannot block yourself") {
        return res.status(400).json({
          success: false,
          message: "You cannot block your own profile"
        });
      }
      return res.status(400).json({ success: false, message: msg });
    }
  } catch (error: any) {
    logger.error("Error in blockController", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function unblockController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { customId } = req.body;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!customId)
      return res
        .status(400)
        .json({ success: false, message: "customId is required" });

    try {
      const result = await unblockUser(userId, customId);
      return res.status(200).json({
        success: true,
        message: "User unblocked successfully",
      });
    } catch (err: any) {
      const msg = err?.message || "Failed to unblock user";
      if (msg.startsWith("Cooldown")) {
        return res.status(429).json({
          success: false,
          message: "You can change block status for this profile after 24 hours"
        });
      }
      if (msg.startsWith("NotBlocked")) {
        return res.status(400).json({
          success: false,
          message: "User is not in your blocked list"
        });
      }
      if (msg === "Target user not found") {
        return res
          .status(404)
          .json({ success: false, message: "Target user not found" });
      }
      return res.status(400).json({ success: false, message: msg });
    }
  } catch (error: any) {
    logger.error("Error in unblockController", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function listBlockedController(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const list = await getBlockedUsers(userId);
    return res.status(200).json({ success: true, data: list });
  } catch (error: any) {
    logger.error("Error in listBlockedController", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
