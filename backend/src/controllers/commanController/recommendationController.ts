import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { findMatchingUsers, getDetailedProfile } from "../../services";
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

    const paginatedResults = matches.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: matches.length,
        hasMore: skip + limitNum < matches.length
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
    let authObjId: mongoose.Types.ObjectId | null = null;

    const matchCriteria: any = {
      isActive: true,
      isDeleted: false,
      isProfileApproved: true,
      profileReviewStatus: "approved"
    };

    let hivFilter: any = null;

    if (requesterId && mongoose.Types.ObjectId.isValid(requesterId)) {
      authObjId = new mongoose.Types.ObjectId(requesterId);

      matchCriteria._id = { $ne: authObjId };

      const [authUser, authHealth] = await Promise.all([
        User.findById(authObjId, "gender blockedUsers").lean(),
        UserHealth.findOne({ userId: authObjId }, "isHaveHIV").lean()
      ]);

      if (authUser) {
        const blockedByMe = (authUser as any).blockedUsers || [];

        if (blockedByMe.length > 0) {
          matchCriteria._id = { ...matchCriteria._id, $nin: blockedByMe };
        }

        matchCriteria.blockedUsers = { $ne: authObjId };

        const gender = String(authUser.gender).toLowerCase();
        if (gender === "male") matchCriteria.gender = "female";
        else if (gender === "female") matchCriteria.gender = "male";
      }

      if (authHealth) {
        const isHIV = isAffirmative((authHealth as any).isHaveHIV);
        const trueValues = [true, "true", "yes", "1", 1];
        const falseValues = [false, "false", "no", "0", 0, "", null];

        if (isHIV) {
          hivFilter = { $in: trueValues };
        } else {
          hivFilter = { $in: falseValues };
        }
      }
    }

    const pipeline: any[] = [
      { $match: matchCriteria },

      {
        $lookup: {
          from: "profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profileDoc"
        }
      },

      { $unwind: "$profileDoc" }
    ];

    if (hivFilter) {
      pipeline.push(
        {
          $lookup: {
            from: "userhealths",
            localField: "_id",
            foreignField: "userId",
            as: "healthDoc"
          }
        },
        { $unwind: { path: "$healthDoc", preserveNullAndEmptyArrays: false } },
        {
          $match: {
            "healthDoc.isHaveHIV": hivFilter
          }
        }
      );
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },

          {
            $lookup: {
              from: "userpersonals",
              localField: "_id",
              foreignField: "userId",
              as: "personalDoc"
            }
          },
          {
            $lookup: {
              from: "userprofessions",
              localField: "_id",
              foreignField: "userId",
              as: "professionDoc"
            }
          },

          {
            $addFields: {
              personal: { $arrayElemAt: ["$personalDoc", 0] },
              profession: { $arrayElemAt: ["$professionDoc", 0] },
              profile: "$profileDoc"
            }
          },

          {
            $project: {
              personalDoc: 0,
              professionDoc: 0,
              profileDoc: 0,
              healthDoc: 0
            }
          }
        ]
      }
    });

    const result = await User.aggregate(pipeline);

    const metadata = result[0].metadata[0] || { total: 0 };
    const usersData = result[0].data || [];

    const formattedResults = await Promise.all(
      usersData.map((user: any) => {
        return formatListingProfile(
          user,
          user.personal,
          user.profile,
          user.profession,
          { score: 0, reasons: [] },
          null
        );
      })
    );

    const validResults = formattedResults.filter((r) => r !== null);

    return res.json({
      success: true,
      data: validResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: metadata.total,
        hasMore: skip + limitNum < metadata.total
      }
    });
  } catch (error) {
    logger.error("Error fetching matches:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch matches"
    });
  }
};
