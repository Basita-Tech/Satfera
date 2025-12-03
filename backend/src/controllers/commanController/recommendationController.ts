import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import {
  computeMatchScore,
  findMatchingUsers,
  getDetailedProfile
} from "../../services";
import { formatListingProfile, logger } from "../../lib";
import {
  UserPersonal,
  User,
  Profile,
  UserHealth,
  UserProfession
} from "../../models";
import { AuthenticatedRequest } from "../../types";
import { APP_CONFIG } from "../../utils/constants";
import { isAffirmative } from "../../utils/utils";

export const testMatchScore = async (req: Request, res: Response) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({
        success: false,
        message: "userId1 and userId2 are required"
      });
    }

    const result = await computeMatchScore(
      new ObjectId(userId1),
      new ObjectId(userId2)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error("Error testing match score:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test match score"
    });
  }
};

export const getMatchings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const result = await findMatchingUsers(new ObjectId(userId));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error("Error fetching matchings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch matchings"
    });
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const userId = req.user?.id;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const recommendations = await findMatchingUsers(userObjectId, 90);

    if (recommendations.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          hasMore: false
        }
      });
    }

    const candidateIds = recommendations.map(
      (r: any) => new mongoose.Types.ObjectId(r.user.userId)
    );

    const [users, personals, profiles, professions] = await Promise.all([
      User.find(
        { _id: { $in: candidateIds } },
        "firstName lastName dateOfBirth createdAt"
      ).lean(),
      UserPersonal.find({ userId: { $in: candidateIds } })
        .select(
          "userId full_address.city full_address.state residingCountry religion subCaste"
        )
        .lean(),
      Profile.find({ userId: { $in: candidateIds } })
        .select("userId favoriteProfiles photos.closerPhoto.url")
        .lean(),
      UserProfession.find({ userId: { $in: candidateIds } })
        .select("userId Occupation")
        .lean()
    ]);

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    const personalMap = new Map(
      personals.map((p: any) => [p.userId.toString(), p])
    );
    const profileMap = new Map(
      profiles.map((p: any) => [p.userId.toString(), p])
    );
    const professionMap = new Map(
      professions.map((p: any) => [p.userId.toString(), p])
    );

    const formattedResults = await Promise.all(
      recommendations.map((rec: any) => {
        const candidateId = rec.user.userId;
        const user = userMap.get(candidateId);
        const personal = personalMap.get(candidateId);
        const profile = profileMap.get(candidateId);
        const profession = professionMap.get(candidateId);

        if (!user) return null;

        return formatListingProfile(
          user,
          personal,
          profile,
          profession,
          rec.scoreDetail || { score: 0, reasons: [] },
          null
        );
      })
    );

    const validResults = formattedResults.filter((r) => r !== null);
    const paginatedResults = validResults.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: validResults.length,
        hasMore: skip + limitNum < validResults.length
      }
    });
  } catch (error) {
    logger.error("Error fetching recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recommendations"
    });
  }
};

export const getMatches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "userId is required"
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const matches = await findMatchingUsers(
      userObjectId,
      APP_CONFIG.MATCHING_SCORE
    );

    if (matches.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          hasMore: false
        }
      });
    }

    const candidateIds = matches.map(
      (m: any) => new mongoose.Types.ObjectId(m.user.userId)
    );

    const [users, personals, profiles, professions] = await Promise.all([
      User.find(
        { _id: { $in: candidateIds } },
        "firstName lastName dateOfBirth createdAt"
      ).lean(),
      UserPersonal.find({ userId: { $in: candidateIds } })
        .select(
          "userId full_address.city full_address.state residingCountry religion subCaste"
        )
        .lean(),
      Profile.find({ userId: { $in: candidateIds } })
        .select("userId favoriteProfiles photos.closerPhoto.url")
        .lean(),
      UserProfession.find({ userId: { $in: candidateIds } })
        .select("userId Occupation")
        .lean()
    ]);

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    const personalMap = new Map(
      personals.map((p: any) => [p.userId.toString(), p])
    );
    const profileMap = new Map(
      profiles.map((p: any) => [p.userId.toString(), p])
    );
    const professionMap = new Map(
      professions.map((p: any) => [p.userId.toString(), p])
    );

    const formattedResults = await Promise.all(
      matches.map((match: any) => {
        const candidateId = match.user.userId;
        const user = userMap.get(candidateId);
        const personal = personalMap.get(candidateId);
        const profile = profileMap.get(candidateId);
        const profession = professionMap.get(candidateId);

        if (!user) return null;

        return formatListingProfile(
          user,
          personal,
          profile,
          profession,
          match.scoreDetail || { score: 0, reasons: [] },
          null
        );
      })
    );

    const validResults = formattedResults.filter((r) => r !== null);
    const paginatedResults = validResults.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: validResults.length,
        hasMore: skip + limitNum < validResults.length
      }
    });
  } catch (error) {
    logger.error("Error fetching matches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch matches"
    });
  }
};

/**
 * Get detailed profile with matching info
 * GET /api/v1/profile/:candidateId
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;
    const viewerId = req.user?.id;

    if (!candidateId || !viewerId || typeof viewerId !== "string") {
      return res.status(400).json({
        success: false,
        message: "candidateId and viewerId are required"
      });
    }

    const profile = await getDetailedProfile(
      new ObjectId(viewerId),
      new ObjectId(candidateId)
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error("Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile"
    });
  }
};

export const getAllProfiles = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const requesterId = req.user?.id;
    let users: any[] = [];
    let personals: any[] = [];
    let profiles: any[] = [];
    let professions: any[] = [];

    const authObjId =
      requesterId && mongoose.Types.ObjectId.isValid(requesterId)
        ? new mongoose.Types.ObjectId(requesterId)
        : requesterId;

    if (requesterId) {
      try {
        const seekerHealth = await UserHealth.findOne({ userId: authObjId })
          .select("isHaveHIV")
          .lean();
        const seekerHasHIV =
          seekerHealth && isAffirmative((seekerHealth as any).isHaveHIV);
        const seekerHasNegative =
          seekerHealth && !isAffirmative((seekerHealth as any).isHaveHIV);

        if (seekerHasHIV) {
          const hivUserIds = await UserHealth.find(
            {
              $or: [
                { isHaveHIV: true },
                { isHaveHIV: "true" },
                { isHaveHIV: "yes" },
                { isHaveHIV: "1" },
                { isHaveHIV: 1 }
              ]
            },
            "userId"
          )
            .lean()
            .then((rows: any[]) => rows.map((r) => r.userId));

          if (hivUserIds.length === 0) {
            return res.json({
              success: true,
              data: [],
              pagination: {
                page: pageNum,
                limit: limitNum,
                total: 0,
                hasMore: false
              }
            });
          }

          // Ensure ids are ObjectId instances where appropriate
          const hivIds = hivUserIds.map((id: any) =>
            mongoose.Types.ObjectId.isValid(String(id))
              ? new mongoose.Types.ObjectId(id)
              : id
          );

          [users, personals, profiles, professions] = await Promise.all([
            User.find(
              { _id: { $in: hivIds, $ne: authObjId } },
              "firstName lastName dateOfBirth createdAt"
            ).lean(),
            UserPersonal.find({
              userId: { $in: hivIds, $ne: authObjId }
            })
              .select(
                "userId full_address.city full_address.state residingCountry religion subCaste"
              )
              .lean(),
            Profile.find({ userId: { $in: hivIds, $ne: authObjId } })
              .select("userId favoriteProfiles photos.closerPhoto.url")
              .lean(),
            UserProfession.find({
              userId: { $in: hivIds, $ne: authObjId }
            })
              .select("userId Occupation")
              .lean()
          ]);
        } else if (seekerHasNegative) {
          // seeker explicitly negative -> only include explicit negative profiles
          const noHivUserIds = await UserHealth.find(
            {
              $or: [
                { isHaveHIV: false },
                { isHaveHIV: "false" },
                { isHaveHIV: "no" },
                { isHaveHIV: "0" },
                { isHaveHIV: 0 }
              ]
            },
            "userId"
          )
            .lean()
            .then((rows: any[]) => rows.map((r) => r.userId));

          if (noHivUserIds.length === 0) {
            return res.json({
              success: true,
              data: [],
              pagination: {
                page: pageNum,
                limit: limitNum,
                total: 0,
                hasMore: false
              }
            });
          }

          const noHivIds = noHivUserIds.map((id: any) =>
            mongoose.Types.ObjectId.isValid(String(id))
              ? new mongoose.Types.ObjectId(id)
              : id
          );

          [users, personals, profiles, professions] = await Promise.all([
            User.find(
              { _id: { $in: noHivIds, $ne: authObjId } },
              "firstName lastName dateOfBirth createdAt"
            ).lean(),
            UserPersonal.find({
              userId: { $in: noHivIds, $ne: authObjId }
            })
              .select(
                "userId full_address.city full_address.state residingCountry religion subCaste"
              )
              .lean(),
            Profile.find({ userId: { $in: noHivIds, $ne: authObjId } })
              .select("userId favoriteProfiles photos.closerPhoto.url")
              .lean(),
            UserProfession.find({
              userId: { $in: noHivIds, $ne: authObjId }
            })
              .select("userId Occupation")
              .lean()
          ]);
        } else {
          [users, personals, profiles, professions] = await Promise.all([
            User.find(
              { _id: { $ne: authObjId } },
              "firstName lastName dateOfBirth createdAt"
            ).lean(),
            UserPersonal.find({ userId: { $ne: authObjId } })
              .select(
                "userId full_address.city full_address.state residingCountry religion subCaste"
              )
              .lean(),
            Profile.find({ userId: { $ne: authObjId } })
              .select("userId favoriteProfiles photos.closerPhoto.url")
              .lean(),
            UserProfession.find({ userId: { $ne: authObjId } })
              .select("userId Occupation")
              .lean()
          ]);
        }
      } catch (e) {
        // fallback to default full list on error
        logger.error("Error applying health filters:", e);
      }
    } else {
      [users, personals, profiles, professions] = await Promise.all([
        User.find({}, "firstName lastName dateOfBirth createdAt").lean(),
        UserPersonal.find({})
          .select(
            "userId full_address.city full_address.state residingCountry religion subCaste"
          )
          .lean(),
        Profile.find({})
          .select("userId favoriteProfiles photos.closerPhoto.url")
          .lean(),
        UserProfession.find({}).select("userId Occupation").lean()
      ]);
    }

    const personalMap = new Map(
      personals.map((p: any) => [p.userId.toString(), p])
    );
    const profileMap = new Map(
      profiles.map((p: any) => [p.userId.toString(), p])
    );
    const professionMap = new Map(
      professions.map((p: any) => [p.userId.toString(), p])
    );

    const formattedResults = await Promise.all(
      users.map((u: any) => {
        const candidateId = u._id.toString();
        const user = u;
        const personal = personalMap.get(candidateId);
        const profile = profileMap.get(candidateId);
        const profession = professionMap.get(candidateId);

        if (!user) return null;

        return formatListingProfile(
          user,
          personal,
          profile,
          profession,
          { score: 0, reasons: [] },
          null
        );
      })
    );

    const validResults = formattedResults.filter((r) => r !== null);
    const paginatedResults = validResults.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: validResults.length,
        hasMore: skip + limitNum < validResults.length
      }
    });
  } catch (error) {
    logger.error("Error fetching matches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch matches"
    });
  }
};
