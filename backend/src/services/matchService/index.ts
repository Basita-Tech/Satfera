import mongoose from "mongoose";
import { Match, IMatch } from "../../models/Matches";
import {
  User,
  UserExpectations,
  UserPersonal,
  UserEducation,
  UserProfession,
  UserHealth,
  Profile,
  ConnectionRequest
} from "../../models";
import { computeMatchScore } from "../recommendationService";
import { logger } from "../../lib/common/logger";
import { APP_CONFIG } from "../../utils/constants";
import { invalidateUserMatchScores } from "../../lib/redis/cacheUtils";

export class MatchService {
  /**
   * Process matches for a newly approved user.
   * Creates bidirectional match entries with all compatible users.
   * Respects MAX_MATCHES_PER_USER limit for both the new user and existing users.
   */
  static async processNewUserMatches(
    userId: mongoose.Types.ObjectId | string
  ): Promise<{ created: number; skipped: number }> {
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const MAX_MATCHES = APP_CONFIG.MAX_MATCHES_PER_USER;

    try {
      const newUser = await User.findById(userObjectId)
        .select(
          "gender isActive isDeleted isVisible isProfileApproved profileReviewStatus blockedUsers dateOfBirth"
        )
        .lean();

      if (!newUser) {
        logger.warn(`processNewUserMatches: User ${userObjectId} not found`);
        return { created: 0, skipped: 0 };
      }

      if (!this.isUserMatchable(newUser)) {
        logger.info(
          `processNewUserMatches: User ${userObjectId} is not matchable`
        );
        return { created: 0, skipped: 0 };
      }

      const existingMatchCount = await Match.countDocuments({
        userId: userObjectId,
        isVisible: true
      });
      if (existingMatchCount >= MAX_MATCHES) {
        logger.info(
          `processNewUserMatches: User ${userObjectId} already has ${existingMatchCount} matches (max: ${MAX_MATCHES})`
        );
        return { created: 0, skipped: existingMatchCount };
      }

      const remainingSlots = MAX_MATCHES - existingMatchCount;
      const oppositeGender = newUser.gender === "male" ? "female" : "male";
      const blockedUserIds = (newUser.blockedUsers || []).map((id: any) =>
        id.toString()
      );

      const candidates = await User.find({
        _id: {
          $ne: userObjectId,
          $nin: blockedUserIds.map(
            (id: string) => new mongoose.Types.ObjectId(id)
          )
        },
        gender: oppositeGender,
        isActive: true,
        isDeleted: false,
        isVisible: true,
        isProfileApproved: true,
        profileReviewStatus: "approved",
        blockedUsers: { $ne: userObjectId }
      })
        .select("_id dateOfBirth")
        .lean();

      if (candidates.length === 0) {
        logger.info(
          `processNewUserMatches: No candidates found for user ${userObjectId}`
        );
        return { created: 0, skipped: 0 };
      }

      const newUserExpectations = await UserExpectations.findOne({
        userId: userObjectId
      }).lean();

      const candidateIds = candidates.map((c: any) => c._id);
      const [
        personals,
        educations,
        professions,
        healths,
        existingRequests,
        existingFavorites,
        candidateMatchCounts
      ] = await Promise.all([
        UserPersonal.find(
          { userId: { $in: candidateIds } },
          "userId religion subCaste full_address.state marriedStatus residingCountry"
        ).lean(),
        UserEducation.find(
          { userId: { $in: candidateIds } },
          "userId HighestEducation"
        ).lean(),
        UserProfession.find(
          { userId: { $in: candidateIds } },
          "userId Occupation"
        ).lean(),
        UserHealth.find(
          { userId: { $in: candidateIds } },
          "userId isAlcoholic diet"
        ).lean(),
        ConnectionRequest.find({
          $or: [
            { sender: userObjectId, receiver: { $in: candidateIds } },
            { sender: { $in: candidateIds }, receiver: userObjectId }
          ],
          status: { $ne: "withdrawn" }
        }).lean(),
        Profile.findOne({ userId: userObjectId }, "favoriteProfiles").lean(),
        Match.aggregate([
          { $match: { userId: { $in: candidateIds }, isVisible: true } },
          { $group: { _id: "$userId", count: { $sum: 1 } } }
        ])
      ]);

      const personalMap = new Map(
        personals.map((p: any) => [p.userId.toString(), p])
      );
      const educationMap = new Map(
        educations.map((e: any) => [e.userId.toString(), e])
      );
      const professionMap = new Map(
        professions.map((p: any) => [p.userId.toString(), p])
      );
      const healthMap = new Map(
        healths.map((h: any) => [h.userId.toString(), h])
      );
      const matchCountMap = new Map(
        candidateMatchCounts.map((m: any) => [m._id.toString(), m.count])
      );

      const requestSet = new Set<string>();
      existingRequests.forEach((r: any) => {
        requestSet.add(
          r.sender.toString() === userObjectId.toString()
            ? r.receiver.toString()
            : r.sender.toString()
        );
      });
      const favoriteSet = new Set<string>(
        ((existingFavorites as any)?.favoriteProfiles || []).map((id: any) =>
          id.toString()
        )
      );

      const matchOperations: any[] = [];
      let created = 0;
      let visibleCreated = 0;
      let skipped = 0;

      for (const candidate of candidates) {
        const candidateId = candidate._id;
        const candidateIdStr = candidateId.toString();

        const candidateMatchCount = matchCountMap.get(candidateIdStr) || 0;
        if (candidateMatchCount >= MAX_MATCHES) {
          skipped++;
          continue;
        }

        const hasRequest = requestSet.has(candidateIdStr);
        const isFavorite = favoriteSet.has(candidateIdStr);
        const isVisible = !hasRequest && !isFavorite;
        const hiddenReason = hasRequest
          ? "request"
          : isFavorite
            ? "favorite"
            : null;

        if (isVisible && visibleCreated >= remainingSlots) {
          skipped++;
          continue;
        }

        const scoreDetail = await computeMatchScore(
          userObjectId,
          new mongoose.Types.ObjectId(candidateIdStr),
          {
            seeker: newUser,
            seekerExpect: newUserExpectations,
            candidate: candidate,
            candidatePersonal: personalMap.get(candidateIdStr),
            candidateEducation: educationMap.get(candidateIdStr),
            candidateProfession: professionMap.get(candidateIdStr),
            candidateHealth: healthMap.get(candidateIdStr)
          }
        );

        if (!scoreDetail || scoreDetail.score < APP_CONFIG.MATCHING_SCORE) {
          continue;
        }

        const matchData = {
          score: scoreDetail.score,
          reasons: scoreDetail.reasons || [],
          isVisible,
          hiddenReason,
          lastCalculatedAt: new Date()
        };

        matchOperations.push({
          updateOne: {
            filter: { userId: userObjectId, candidateId: candidateId },
            update: { $set: matchData },
            upsert: true
          }
        });

        const reverseIsVisible = isVisible;
        matchOperations.push({
          updateOne: {
            filter: { userId: candidateId, candidateId: userObjectId },
            update: {
              $set: {
                ...matchData,
                isVisible: reverseIsVisible,
                hiddenReason: hiddenReason
              }
            },
            upsert: true
          }
        });

        created++;
        if (isVisible) {
          visibleCreated++;
        }
      }

      if (matchOperations.length > 0) {
        await Match.bulkWrite(matchOperations, { ordered: false });
        logger.info(
          `processNewUserMatches: Created ${created * 2} match entries (${created} pairs) for user ${userObjectId}`
        );
      }

      await invalidateUserMatchScores(userObjectId);

      return { created: created * 2, skipped };
    } catch (error: any) {
      logger.error("Error in processNewUserMatches:", {
        userId: userObjectId.toString(),
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get paginated visible matches for a user.
   */
  static async getUserMatches(
    userId: mongoose.Types.ObjectId | string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    matches: IMatch[];
    total: number;
    page: number;
    limit: number;
  }> {
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const skip = (page - 1) * limit;

    try {
      const [matches, total] = await Promise.all([
        Match.find({ userId: userObjectId, isVisible: true })
          .sort({ createdAt: "desc" })
          .skip(skip)
          .limit(limit)
          .lean(),
        Match.countDocuments({ userId: userObjectId, isVisible: true })
      ]);

      return { matches: matches as any[], total, page, limit };
    } catch (error: any) {
      logger.error("Error in getUserMatches:", {
        userId: userObjectId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Hide match when connection request is sent.
   */
  static async hideMatchForRequest(
    userId: mongoose.Types.ObjectId | string,
    candidateId: mongoose.Types.ObjectId | string
  ): Promise<void> {
    await this.setMatchVisibility(userId, candidateId, false, "request");
  }

  /**
   * Show match when connection request is withdrawn.
   */
  static async showMatchForWithdraw(
    userId: mongoose.Types.ObjectId | string,
    candidateId: mongoose.Types.ObjectId | string
  ): Promise<void> {
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const candidateObjectId =
      typeof candidateId === "string"
        ? new mongoose.Types.ObjectId(candidateId)
        : candidateId;

    const profile = await Profile.findOne(
      { userId: userObjectId },
      "favoriteProfiles"
    ).lean();
    const isFavorite = ((profile as any)?.favoriteProfiles || []).some(
      (id: any) => id.toString() === candidateObjectId.toString()
    );

    if (isFavorite) {
      await this.setMatchVisibility(userId, candidateId, false, "favorite");
    } else {
      await this.setMatchVisibility(userId, candidateId, true, null);
    }
  }

  /**
   * Hide match when added to favorites.
   */
  static async hideMatchForFavorite(
    userId: mongoose.Types.ObjectId | string,
    candidateId: mongoose.Types.ObjectId | string
  ): Promise<void> {
    await this.setMatchVisibility(userId, candidateId, false, "favorite");
  }

  /**
   * Show match when removed from favorites.
   */
  static async showMatchForUnfavorite(
    userId: mongoose.Types.ObjectId | string,
    candidateId: mongoose.Types.ObjectId | string
  ): Promise<void> {
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const candidateObjectId =
      typeof candidateId === "string"
        ? new mongoose.Types.ObjectId(candidateId)
        : candidateId;

    const request = await ConnectionRequest.findOne({
      $or: [
        { sender: userObjectId, receiver: candidateObjectId },
        { sender: candidateObjectId, receiver: userObjectId }
      ],
      status: { $ne: "withdrawn" }
    }).lean();

    if (request) {
      await this.setMatchVisibility(userId, candidateId, false, "request");
    } else {
      await this.setMatchVisibility(userId, candidateId, true, null);
    }
  }

  /**
   * Invalidate and recalculate matches for a user (e.g., after profile update).
   */
  static async recalculateUserMatches(
    userId: mongoose.Types.ObjectId | string
  ): Promise<void> {
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    try {
      await Match.deleteMany({
        $or: [{ userId: userObjectId }, { candidateId: userObjectId }]
      });

      await invalidateUserMatchScores(userObjectId);

      await this.processNewUserMatches(userObjectId);

      logger.info(`recalculateUserMatches: Completed for user ${userObjectId}`);
    } catch (error: any) {
      logger.error("Error in recalculateUserMatches:", {
        userId: userObjectId.toString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get match count for a user.
   */
  static async getMatchCount(
    userId: mongoose.Types.ObjectId | string
  ): Promise<number> {
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    return Match.countDocuments({ userId: userObjectId });
  }

  /**
   * Check if a user meets all criteria to be matchable.
   */
  private static isUserMatchable(user: any): boolean {
    return (
      user.isActive === true &&
      user.isDeleted === false &&
      user.isVisible !== false &&
      user.isProfileApproved === true &&
      user.profileReviewStatus === "approved"
    );
  }

  /**
   * Set visibility for a match pair (bidirectional).
   */
  private static async setMatchVisibility(
    userId: mongoose.Types.ObjectId | string,
    candidateId: mongoose.Types.ObjectId | string,
    isVisible: boolean,
    hiddenReason: "request" | "favorite" | null
  ): Promise<void> {
    const userObjectId =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    const candidateObjectId =
      typeof candidateId === "string"
        ? new mongoose.Types.ObjectId(candidateId)
        : candidateId;

    try {
      await Match.updateOne(
        { userId: userObjectId, candidateId: candidateObjectId },
        { $set: { isVisible, hiddenReason } }
      );

      await Match.updateOne(
        { userId: candidateObjectId, candidateId: userObjectId },
        { $set: { isVisible, hiddenReason } }
      );

      logger.debug(
        `setMatchVisibility: ${userObjectId} <-> ${candidateObjectId} = ${isVisible}`
      );
    } catch (error: any) {
      logger.error("Error in setMatchVisibility:", { error: error.message });
    }
  }
}

export default MatchService;
