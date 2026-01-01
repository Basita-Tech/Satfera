import { Response } from "express";
import { AuthenticatedRequest } from "../../../types";
import { MatchService } from "../../../services/matchService";
import { logger } from "../../../lib/common/logger";
import {
  User,
  UserPersonal,
  Profile,
  UserProfession,
  UserEducation,
  UserHealth
} from "../../../models";
import { formatListingProfile } from "../../../lib/common/formatting";

/**
 * Uses stored Match collection instead of real-time calculation
 */
export const getMatchesV2 = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { matches, total } = await MatchService.getUserMatches(
      userId,
      page,
      limit
    );

    if (matches.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: 0,
          hasMore: false
        }
      });
    }

    const candidateIds = matches.map((m) => m.candidateId);

    const [users, personals, profiles, professions, educations, healths] =
      await Promise.all([
        User.find({ _id: { $in: candidateIds } })
          .select(
            "firstName lastName dateOfBirth gender createdAt isProfileApproved profileReviewStatus blockedUsers"
          )
          .lean(),
        UserPersonal.find({ userId: { $in: candidateIds } }).lean(),
        Profile.find({ userId: { $in: candidateIds } })
          .select("userId photos.closerPhoto privacy isVisible ProfileViewed")
          .lean(),
        UserProfession.find({ userId: { $in: candidateIds } }).lean(),
        UserEducation.find({ userId: { $in: candidateIds } }).lean(),
        UserHealth.find({ userId: { $in: candidateIds } }).lean()
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
    const educationMap = new Map(
      educations.map((p: any) => [p.userId.toString(), p])
    );
    const healthMap = new Map(
      healths.map((p: any) => [p.userId.toString(), p])
    );

    const currentUserProfile = await Profile.findOne({ userId })
      .select("favoriteProfiles")
      .lean();
    const favoriteSet = new Set(
      ((currentUserProfile as any)?.favoriteProfiles || []).map((id: any) =>
        id.toString()
      )
    );

    const formattedMatches = await Promise.all(
      matches.map(async (match) => {
        const candidateIdStr = match.candidateId.toString();
        const user = userMap.get(candidateIdStr);
        const personal = personalMap.get(candidateIdStr);
        const profile = profileMap.get(candidateIdStr);
        const profession = professionMap.get(candidateIdStr);

        if (!user) return null;

        const isFavorite = favoriteSet.has(candidateIdStr);

        return formatListingProfile(
          user,
          personal,
          profile,
          profession,
          {
            score: match.score,
            reasons: match.reasons || []
          },
          null,
          isFavorite
        );
      })
    );

    const validMatches = formattedMatches.filter((m) => m !== null);

    return res.status(200).json({
      success: true,
      data: validMatches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error: any) {
    logger.error("Error in getMatchesV2:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch matches"
    });
  }
};
