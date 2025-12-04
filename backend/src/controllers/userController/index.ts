import { Request, Response } from "express";
import { logger } from "../../lib/common/logger";
import { AuthenticatedRequest } from "../../types";
import {
  compareProfilesService,
  getUserDashboardService,
  getUserProfileViewsService,
  addCompareProfilesToProfile,
  getCompareProfilesForUser,
  removeCompareProfilesFromProfile,
  searchService,
  downloadMyPdfData
} from "../../services/userPersonalService/userService";
import { User } from "../../models";

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

export async function searchController(req: Request, res: Response) {
  try {
    const {
      name,
      customId,
      newProfile,
      ageFrom,
      ageTo,
      heightFrom,
      heightTo,
      religion,
      caste,
      city,
      profession,
      sortBy,
      page = "1",
      limit = "20"
    } = req.query as any;

    const filters: any = {};
    if (name) filters.name = String(name);
    if (customId) filters.customId = String(customId);
    if (newProfile) filters.newProfile = String(newProfile) as any;
    if (ageFrom) filters.ageFrom = parseInt(String(ageFrom), 10);
    if (ageTo) filters.ageTo = parseInt(String(ageTo), 40);
    if (heightFrom) filters.heightFrom = Number(heightFrom);
    if (heightTo) filters.heightTo = Number(heightTo);
    if (religion) filters.religion = String(religion);
    if (caste) filters.caste = String(caste);
    if (city) filters.city = String(city);
    if (profession) filters.profession = String(profession);

    const authUserId = req.user?.id;

    const authUser = await User.findById(authUserId).select("gender").lean();

    if (authUser && (authUser as any).gender) {
      const g = String((authUser as any).gender).toLowerCase();
      if (g === "male") filters.gender = "female";
      else if (g === "female") filters.gender = "male";
    }
    if (sortBy) filters.sortBy = String(sortBy);

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 20)
    );

    const result = await searchService(filters, pageNum, limitNum, authUserId);

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (err: any) {
    console.error("searchController error:", err);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
}

export async function downloadMyPdfDataController(
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

    const data = await downloadMyPdfData(userId);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    logger.error("Error downloading user PDF data:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: "Failed to download PDF data"
    });
  }
}

export * from "./userSettingController";
