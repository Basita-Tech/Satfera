import { Request, Response } from "express";
import { logger } from "../../lib/common/logger";
import { validationResult } from "express-validator";
import { AuthenticatedRequest } from "../../types";
import {
  changeUserPasswordService,
  compareProfilesService,
  getUserDashboardService,
  getUserProfileViewsService,
  addCompareProfilesToProfile,
  getCompareProfilesForUser,
  removeCompareProfilesFromProfile
} from "../../services/userPersonalService/userService";

export async function getUserDashboardController(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const dashboardData = await getUserDashboardService(userId);

    return res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    logger.error("Error fetching user dashboard:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data"
    });
  }
}

export async function changeUserPassword(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors
        .array()
        .map((e) => e.msg)
        .toString()
    });
  }

  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user?.id;

  const result = await changeUserPasswordService(
    userId!,
    oldPassword,
    newPassword,
    confirmPassword
  );

  if (result.success) {
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } else {
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }
}

export async function getUserProfileViewsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "10"), 10) || 10)
    );

    const { data, pagination, profileViewCount } =
      await getUserProfileViewsService(userId, page, limit);

    return res
      .status(200)
      .json({ success: true, profileViewCount, data, pagination });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to get profile views" });
  }
}

export async function compareProfilesController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const profilesIds = req.body.profilesIds;
    if (!Array.isArray(profilesIds) || profilesIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "profilesIds must be a non-empty array of user ids"
      });
    }
    if (profilesIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: "You can compare up to 5 profiles only"
      });
    }

    const authUserId = req.user?.id;

    const compareData = await compareProfilesService(
      profilesIds,
      authUserId || null
    );

    return res.json({ success: true, data: compareData });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to compare profiles" });
  }
}

export async function addCompareController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const profilesIds = req.body.profilesIds;
    if (!Array.isArray(profilesIds) || profilesIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "profilesIds must be a non-empty array"
      });
    }
    const authUserId = req.user?.id;
    if (!authUserId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    try {
      const incoming = Array.from(new Set(profilesIds.map(String)));

      if (incoming.includes(String(authUserId))) {
        return res.status(400).json({
          success: false,
          message: "Cannot add your own profile to compare list"
        });
      }

      const existing = await getCompareProfilesForUser(authUserId);

      if ((existing || []).length >= 5) {
        return res.status(400).json({
          success: false,
          message:
            "Compare list already contains 5 profiles. Remove one before adding a new profile."
        });
      }

      const toAdd = incoming.filter((id) => !existing.includes(id));

      if (toAdd.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No new profiles to add — provided ids already exist in compare list"
        });
      }

      if (existing.length + toAdd.length > 5) {
        return res.status(400).json({
          success: false,
          message:
            "Adding these profiles would exceed the 5-profile limit. Remove one and try again."
        });
      }

      await addCompareProfilesToProfile(authUserId, toAdd);

      return res.json({
        success: true,
        message: "Profiles added to compare list"
      });
    } catch (e: any) {
      if (String(e.message).startsWith("LimitExceeded")) {
        return res.status(400).json({
          success: false,
          message: "You can compare up to 5 profiles only"
        });
      }
      return res.status(400).json({
        success: false,
        message: e.message || "Failed to add compare profiles"
      });
    }
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to add compare profiles" });
  }
}

export async function getCompareController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const authUserId = req.user?.id;
    if (!authUserId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const ids = await getCompareProfilesForUser(authUserId);
    const data = await compareProfilesService(ids, authUserId);
    return res.json({ success: true, data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch compare profiles" });
  }
}

export async function deleteCompareController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const profilesIds = req.body.profilesIds;
    if (!Array.isArray(profilesIds) || profilesIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "profilesIds must be a non-empty array"
      });
    }
    const authUserId = req.user?.id;
    if (!authUserId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    await removeCompareProfilesFromProfile(authUserId, profilesIds.map(String));

    return res.json({
      success: true,
      message: "Profiles removed from compare list"
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove compare profiles" });
  }
}

export * from "./blockController";
