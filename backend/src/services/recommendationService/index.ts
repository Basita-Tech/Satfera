import mongoose from "mongoose";
import {
  User,
  UserExpectations,
  UserPersonal,
  UserEducation,
  UserProfession,
  ConnectionRequest,
  UserHealth,
  Profile,
  ProfileView,
  Notification,
  UserFamily
} from "../../models";
import {
  logger,
  getFilteredPhotos,
  getConnectionPhotosUnblurred,
  ageOverlapScore,
  communityScore,
  professionScore,
  dietScore,
  educationScore,
  alcoholScore,
  formatListingProfile,
  formatDetailedProfile,
  getCachedMatchScore,
  hasViewedInLast24Hours,
  markProfileViewed,
  setCachedMatchScore
} from "../../lib";
import {
  ScoreDetail,
  MatchingStatus,
  ListingProfile,
  PreloadedScoreData
} from "../../types";
import {
  calculateAge,
  toArrayOfStrings,
  isNoPreference,
  withDefaults,
  getWeekStartDate,
  getWeekNumber,
  isAffirmative
} from "../../utils/utils";
import { SCORE_WEIGHTS, DEFAULT_EXPECTATIONS } from "../../utils/constants";

const SCORE_THRESHOLDS = {
  MIN_MATCH: 70,
  NEUTRAL: 50,
  GOOD_MATCH: 80,
  EXCELLENT_MATCH: 90,
  PERFECT_MATCH: 100,
  NO_MATCH: 1
};

export async function getWeeklyViewCounts(
  candidateId: mongoose.Types.ObjectId
): Promise<
  Array<{
    week: number;
    weekStartDate: Date;
    viewCount: number;
  }>
> {
  try {
    const pipeline: any[] = [
      { $match: { candidate: candidateId } },
      {
        $group: {
          _id: "$weekStartDate",
          weekNumber: { $first: "$weekNumber" },
          viewCount: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          weekStartDate: "$_id",
          week: "$weekNumber",
          viewCount: 1
        }
      }
    ];

    const results = await ProfileView.aggregate(pipeline);
    return results;
  } catch (error: any) {
    logger.error("Error fetching weekly view counts:", {
      error: error.message,
      stack: error.stack
    });
    return [];
  }
}

export async function computeMatchScore(
  seekerUserId: mongoose.Types.ObjectId,
  candidateUserId: mongoose.Types.ObjectId,
  preloadedData?: PreloadedScoreData
): Promise<ScoreDetail | null> {
  try {
    if (
      !mongoose.isValidObjectId(seekerUserId) ||
      !mongoose.isValidObjectId(candidateUserId)
    ) {
      logger.warn("Invalid ObjectId provided to computeMatchScore");
      return null;
    }

    const cachedScore = await getCachedMatchScore(
      seekerUserId,
      candidateUserId
    );
    if (cachedScore) {
      logger.debug(
        `Using cached match score for ${seekerUserId} -> ${candidateUserId}`
      );
      return cachedScore;
    }

    let seeker = preloadedData?.seeker;
    let seekerExpectRaw = preloadedData?.seekerExpect;
    let candidate = preloadedData?.candidate;
    let candidatePersonalData = preloadedData?.candidatePersonal;
    let candidateHealthData = preloadedData?.candidateHealth;
    let candidateEducationData = preloadedData?.candidateEducation;
    let candidateProfessionData = preloadedData?.candidateProfession;

    if (!seeker || !seekerExpectRaw || !candidate) {
      const [s, se, c] = await Promise.all([
        seeker ||
          User.findById(seekerUserId, "firstName lastName dateOfBirth").lean(),
        seekerExpectRaw ||
          UserExpectations.findOne({ userId: seekerUserId }).lean(),

        candidate ||
          User.findById(
            candidateUserId,
            "firstName lastName dateOfBirth gender isActive createdAt"
          ).lean()
      ]);
      seeker = s;
      seekerExpectRaw = se;
      candidate = c;
    }

    if (!seeker || !candidate) return null;

    if (
      !candidatePersonalData ||
      !candidateHealthData ||
      !candidateEducationData ||
      !candidateProfessionData
    ) {
      // Only fetch the fields needed for scoring to reduce payload
      const [cp, ch, ce, cpf] = await Promise.all([
        candidatePersonalData ||
          UserPersonal.findOne(
            { userId: candidateUserId },
            "userId religion subCaste full_address.state marriedStatus residingCountry"
          ).lean(),
        candidateHealthData ||
          UserHealth.findOne(
            { userId: candidateUserId },
            "userId isAlcoholic diet"
          ).lean(),
        candidateEducationData ||
          UserEducation.findOne(
            { userId: candidateUserId },
            "userId HighestEducation"
          ).lean(),
        candidateProfessionData ||
          UserProfession.findOne(
            { userId: candidateUserId },
            "userId Occupation"
          ).lean()
      ]);
      candidatePersonalData = cp;
      candidateHealthData = ch;
      candidateEducationData = ce;
      candidateProfessionData = cpf;
    }

    const seekerExpect = withDefaults(seekerExpectRaw, DEFAULT_EXPECTATIONS);
    const reasons: string[] = [];

    const candidateAge = candidate?.dateOfBirth
      ? calculateAge(candidate.dateOfBirth)
      : null;
    const ageScoreRaw =
      candidateAge !== null
        ? ageOverlapScore(seekerExpect.age, candidateAge)
        : SCORE_THRESHOLDS.NEUTRAL;

    if (ageScoreRaw >= SCORE_THRESHOLDS.GOOD_MATCH)
      reasons.push("Age within preferred range");

    const candidateCommunityArray = candidatePersonalData?.religion
      ? [candidatePersonalData.religion, candidatePersonalData.subCaste].filter(
          Boolean
        )
      : [];
    const communityScoreRaw = communityScore(
      seekerExpect.community,
      candidateCommunityArray
    );
    if (communityScoreRaw >= SCORE_THRESHOLDS.NEUTRAL)
      reasons.push("Community preference matched");

    let locationScoreRaw = SCORE_THRESHOLDS.NO_MATCH;
    const seekerCountries = toArrayOfStrings(seekerExpect.livingInCountry);
    const seekerStates = toArrayOfStrings(seekerExpect.livingInState);
    const candidateCountry = candidatePersonalData?.residingCountry;
    const candidateState = candidatePersonalData?.full_address?.state;

    if (
      locationScoreRaw === SCORE_THRESHOLDS.NO_MATCH &&
      (isNoPreference(seekerCountries) || seekerCountries.length === 0)
    ) {
      locationScoreRaw = SCORE_THRESHOLDS.PERFECT_MATCH;
    } else if (
      locationScoreRaw === SCORE_THRESHOLDS.NO_MATCH &&
      candidateCountry
    ) {
      const includeCountries = seekerCountries.filter(
        (c) => !c.toLowerCase().startsWith("not ")
      );
      const excludeCountries = seekerCountries
        .filter((c) => c.toLowerCase().startsWith("not "))
        .map((c) => c.slice(4).toLowerCase());

      const candCountryLower = candidateCountry.toLowerCase();

      const inInclude =
        includeCountries.length === 0 ||
        includeCountries.some((c) => c.toLowerCase() === candCountryLower);
      const inExclude = excludeCountries.some((c) => c === candCountryLower);

      if (inInclude && !inExclude) {
        locationScoreRaw = SCORE_THRESHOLDS.GOOD_MATCH;
        reasons.push("Same country");
      }
    }

    if (
      candidateState &&
      !isNoPreference(seekerStates) &&
      seekerStates.length > 0
    ) {
      const includeStates = seekerStates.filter(
        (s) => !s.toLowerCase().startsWith("not ")
      );
      const excludeStates = seekerStates
        .filter((s) => s.toLowerCase().startsWith("not "))
        .map((s) => s.slice(4).toLowerCase());

      const candStateLower = candidateState.toLowerCase();

      const inInclude =
        includeStates.length === 0 ||
        includeStates.some((s) => s.toLowerCase() === candStateLower);
      const inExclude = excludeStates.some((s) => s === candStateLower);

      if (inInclude && !inExclude) {
        locationScoreRaw = SCORE_THRESHOLDS.PERFECT_MATCH;
        reasons.push("Same state");
      }
    }

    let maritalScoreRaw = SCORE_THRESHOLDS.NO_MATCH;
    const seekerMaritalPrefs = toArrayOfStrings(seekerExpect.maritalStatus);
    const candidateMaritalStatus = candidatePersonalData?.marriedStatus;

    if (isNoPreference(seekerMaritalPrefs)) {
      maritalScoreRaw = SCORE_THRESHOLDS.PERFECT_MATCH;
    } else {
      const include = seekerMaritalPrefs.filter(
        (p) => !p.toLowerCase().startsWith("not ")
      );
      const exclude = seekerMaritalPrefs
        .filter((p) => p.toLowerCase().startsWith("not "))
        .map((p) => p.slice(4).toLowerCase());

      const candLower = candidateMaritalStatus
        ? candidateMaritalStatus.toLowerCase()
        : "";

      const inInclude =
        include.length === 0 ||
        include.some((inc) => inc.toLowerCase() === candLower);
      const inExclude = exclude.some((exc) => exc === candLower);

      if (inInclude && !inExclude) {
        maritalScoreRaw = SCORE_THRESHOLDS.PERFECT_MATCH;
      }
    }

    if (maritalScoreRaw >= SCORE_THRESHOLDS.NEUTRAL)
      reasons.push("Marital status match");

    const educationScoreRaw = educationScore(
      seekerExpect.educationLevel,
      candidateEducationData?.HighestEducation
    );
    if (educationScoreRaw >= SCORE_THRESHOLDS.GOOD_MATCH)
      reasons.push("Education matches");

    const alcoholScoreRaw = alcoholScore(
      seekerExpect.isConsumeAlcoholic,
      candidateHealthData?.isAlcoholic
    );
    if (alcoholScoreRaw >= SCORE_THRESHOLDS.NEUTRAL)
      reasons.push("Alcohol preference matches");

    const seekerProfessions = toArrayOfStrings(seekerExpect.profession);
    const candidateProfessionOccupation = candidateProfessionData?.Occupation
      ? [candidateProfessionData.Occupation]
      : [];
    const professionScoreRaw = professionScore(
      seekerProfessions,
      candidateProfessionOccupation
    );
    if (professionScoreRaw >= SCORE_THRESHOLDS.NEUTRAL)
      reasons.push("Profession preference matched");

    const seekerDiets = toArrayOfStrings(seekerExpect.diet);
    const candidateDietType = candidateHealthData?.diet;
    const dietScoreRaw = dietScore(seekerDiets, candidateDietType);
    if (dietScoreRaw >= SCORE_THRESHOLDS.EXCELLENT_MATCH)
      reasons.push("Diet preference matched");

    const weightedSum =
      ageScoreRaw * SCORE_WEIGHTS.age +
      communityScoreRaw * SCORE_WEIGHTS.community +
      locationScoreRaw * SCORE_WEIGHTS.location +
      maritalScoreRaw * SCORE_WEIGHTS.maritalStatus +
      educationScoreRaw * SCORE_WEIGHTS.education +
      alcoholScoreRaw * SCORE_WEIGHTS.alcohol +
      professionScoreRaw * SCORE_WEIGHTS.profession +
      dietScoreRaw * SCORE_WEIGHTS.diet;

    const totalWeights = Object.values(SCORE_WEIGHTS).reduce(
      (a, b) => a + b,
      0
    );
    const averaged = weightedSum / totalWeights;
    const normalized = Math.max(1, Math.min(100, Math.round(averaged)));

    const scoreDetail = {
      score: normalized,
      reasons: Array.from(new Set(reasons))
    };

    await setCachedMatchScore(seekerUserId, candidateUserId, scoreDetail);

    return scoreDetail;
  } catch (error: any) {
    logger.error("Error in computeMatchScore:", {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

async function getConnectionStatus(
  seekerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<MatchingStatus> {
  try {
    const request = await ConnectionRequest.findOne(
      {
        $or: [
          { sender: seekerId, receiver: candidateId },
          { sender: candidateId, receiver: seekerId }
        ]
      },
      { status: 1 }
    ).lean();

    if (!request) return null;
    return request.status as MatchingStatus;
  } catch (error: any) {
    logger.error("Error in getConnectionStatus:", {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

export async function findMatchingUsers(
  seekerUserId: mongoose.Types.ObjectId,
  minScore: number = SCORE_THRESHOLDS.MIN_MATCH
): Promise<{ user: ListingProfile; scoreDetail: ScoreDetail }[]> {
  try {
    const seekerUser = await User.findById(
      seekerUserId,
      "firstName lastName dateOfBirth gender blockedUsers"
    ).lean();
    if (!seekerUser) return [];

    const seekerExpectations = await UserExpectations.findOne({
      userId: seekerUserId
    }).lean();

    const seekerProfile = (await Profile.findOne(
      { userId: seekerUserId },
      "favoriteProfiles userId"
    ).lean()) as any;

    const genderValue = String(seekerUser.gender);
    const oppositeGender = genderValue === "male" ? "female" : "male";

    const excludedIds: any[] = (seekerUser as any)?.blockedUsers || [];
    const baseQuery: any = {
      _id: { $ne: seekerUserId },
      gender: oppositeGender,
      isActive: true,
      isDeleted: false,
      blockedUsers: { $ne: seekerUserId }
    };
    if (excludedIds.length > 0) {
      baseQuery._id.$nin = excludedIds;
    }

    let candidates = (await User.find(
      baseQuery,
      "firstName lastName dateOfBirth gender createdAt"
    ).lean()) as any[];

    const favoriteIds = new Set(
      (seekerProfile?.favoriteProfiles || []).map((id: any) => id.toString())
    );
    if (favoriteIds.size > 0) {
      candidates = candidates.filter((c) => !favoriteIds.has(c._id.toString()));
    }

    if (candidates.length === 0) return [];

    const matchingUsers: { user: ListingProfile; scoreDetail: ScoreDetail }[] =
      [];

    let candidateIds = candidates.map((c) => c._id);

    const [
      personals,
      educations,
      professions,
      healths,
      connectionRequests,
      profiles,
      seekerHealth
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
        "userId isAlcoholic diet isHaveHIV"
      ).lean(),

      ConnectionRequest.find(
        {
          $or: [
            { sender: seekerUserId, receiver: { $in: candidateIds } },
            { sender: { $in: candidateIds }, receiver: seekerUserId }
          ]
        },
        { sender: 1, receiver: 1, status: 1, createdAt: 1 }
      )
        .sort({ createdAt: -1 })
        .lean(),

      Profile.find(
        { userId: { $in: candidateIds } },
        "userId photos.closerPhoto privacy isVisible ProfileViewed"
      ).lean(),
      UserHealth.findOne({ userId: seekerUserId }, "userId isHaveHIV").lean()
    ]);
    const seekerHasHIV = seekerHealth && isAffirmative(seekerHealth.isHaveHIV);
    const seekerHasNotHIV =
      seekerHealth && !isAffirmative(seekerHealth.isHaveHIV);

    if (seekerHasHIV) {
      const hivCandidateIds = new Set(
        (healths || [])
          .filter((h: any) => h && isAffirmative(h.isHaveHIV))
          .map((h: any) => String(h.userId))
      );

      candidates = candidates.filter((c) => hivCandidateIds.has(String(c._id)));
      if (!candidates || candidates.length === 0) return [];

      candidateIds = candidates.map((c) => c._id);
    } else if (seekerHasNotHIV) {
      const negativeCandidateIds = new Set(
        (healths || [])
          .filter((h: any) => h && !isAffirmative(h.isHaveHIV))
          .map((h: any) => String(h.userId))
      );

      candidates = candidates.filter((c) =>
        negativeCandidateIds.has(String(c._id))
      );
      if (!candidates || candidates.length === 0) return [];

      candidateIds = candidates.map((c) => c._id);
    }

    const idSet = new Set(candidateIds.map((id) => String(id)));

    const personalMap = new Map(
      (personals || [])
        .filter((p: any) => idSet.has(String(p.userId)))
        .map((p: any) => [p.userId.toString(), p])
    );
    const educationMap = new Map(
      (educations || [])
        .filter((e: any) => idSet.has(String(e.userId)))
        .map((e: any) => [e.userId.toString(), e])
    );
    const professionMap = new Map(
      (professions || [])
        .filter((pr: any) => idSet.has(String(pr.userId)))
        .map((pr: any) => [pr.userId.toString(), pr])
    );
    const healthMap = new Map(
      (healths || [])
        .filter((h: any) => idSet.has(String(h.userId)))
        .map((h: any) => [h.userId.toString(), h])
    );
    const profileMap = new Map(
      (profiles || [])
        .filter((p: any) => idSet.has(String(p.userId)))
        .map((p: any) => [p.userId.toString(), p])
    );

    const connectionMap = new Map<string, string>();
    for (const conn of connectionRequests) {
      const key =
        conn.sender.toString() === seekerUserId.toString()
          ? conn.receiver.toString()
          : conn.sender.toString();
      if (!idSet.has(key)) continue;
      if (!connectionMap.has(key)) {
        connectionMap.set(key, conn.status);
      }
    }

    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const candidateIdStr = candidate._id.toString();

        const candidateId = candidate._id as unknown as mongoose.Types.ObjectId;

        const scoreDetail = await computeMatchScore(seekerUserId, candidateId, {
          seeker: seekerUser,
          seekerExpect: seekerExpectations,
          candidate: candidate,
          candidatePersonal: personalMap.get(candidateIdStr),
          candidateEducation: educationMap.get(candidateIdStr),
          candidateProfession: professionMap.get(candidateIdStr),
          candidateHealth: healthMap.get(candidateIdStr)
        });

        return { candidate, candidateIdStr, scoreDetail };
      })
    );

    const qualifiedCandidates = scoredCandidates.filter(
      ({ scoreDetail, candidateIdStr }) =>
        scoreDetail &&
        scoreDetail.score >= minScore &&
        !connectionMap.has(candidateIdStr)
    );

    for (let i = 0; i < qualifiedCandidates.length; i++) {
      const item = qualifiedCandidates[i];
      if (!item || !item.scoreDetail) continue;

      const { candidate, candidateIdStr, scoreDetail } = item;
      const personal = personalMap.get(candidateIdStr);
      const profile = profileMap.get(candidateIdStr);
      const profession = professionMap.get(candidateIdStr);

      const listingProfile = await formatListingProfile(
        candidate,
        personal,
        profile,
        profession,
        scoreDetail,
        null
      );

      matchingUsers.push(listingProfile);
    }

    matchingUsers.sort((a, b) => b.scoreDetail.score - a.scoreDetail.score);

    logger.info(
      `Matching users found (>=${minScore}): ${matchingUsers.length}/${candidates.length}`
    );
    return matchingUsers;
  } catch (error: any) {
    logger.error("Error in findMatchingUsers:", {
      error: error.message,
      stack: error.stack
    });
    return [];
  }
}

export async function getDetailedProfile(
  viewerId: mongoose.Types.ObjectId,
  candidateId: mongoose.Types.ObjectId
): Promise<any> {
  try {
    const [
      candidate,
      personal,
      education,
      profession,
      family,
      health,
      scoreDetail,
      status,
      viewer
    ] = await Promise.all([
      User.findById(
        candidateId,
        "firstName lastName middleName dateOfBirth gender isActive createdAt phoneNumber email customId blockedUsers"
      ).lean(),
      UserPersonal.findOne({ userId: candidateId }).lean(),
      UserEducation.findOne({ userId: candidateId }).lean(),
      UserProfession.findOne({ userId: candidateId }).lean(),
      UserFamily.findOne({ userId: candidateId }).lean(),
      UserHealth.findOne({ userId: candidateId }).lean(),
      computeMatchScore(viewerId, candidateId),
      getConnectionStatus(viewerId, candidateId),
      User.findById(viewerId, "firstName lastName blockedUsers").lean()
    ]);

    if (!candidate) return null;

    try {
      const viewerBlockedCandidate =
        (viewer as any)?.blockedUsers &&
        Array.isArray((viewer as any).blockedUsers) &&
        (viewer as any).blockedUsers.some(
          (id: any) => String(id) === String(candidateId)
        );

      const candidateBlockedViewer =
        (candidate as any)?.blockedUsers &&
        Array.isArray((candidate as any).blockedUsers) &&
        (candidate as any).blockedUsers.some(
          (id: any) => String(id) === String(viewerId)
        );

      if (viewerBlockedCandidate || candidateBlockedViewer) {
        return null;
      }
    } catch (e) {
      return null;
    }

    const profileData = (await Profile.findOne({
      userId: candidateId
    }).lean()) as any;
    const score = scoreDetail || { score: 0, reasons: [] };

    const viewerProfile = (await Profile.findOne(
      { userId: viewerId },
      "favoriteProfiles userId"
    ).lean()) as any;

    let filteredPhotos = await getFilteredPhotos(
      profileData?.photos,
      viewerId,
      candidateId,
      "user",
      true
    );

    if (status === "accepted") {
      const unblurredPhotos = getConnectionPhotosUnblurred(profileData?.photos);
      if (Array.isArray(filteredPhotos) && Array.isArray(unblurredPhotos)) {
        const combined = [...filteredPhotos, ...unblurredPhotos];

        const deduped: any = Array.from(
          new Map(combined.map((p: any) => [p.id || p.url, p])).values()
        );
        filteredPhotos = deduped;
      } else if (
        filteredPhotos &&
        typeof filteredPhotos === "object" &&
        unblurredPhotos &&
        typeof unblurredPhotos === "object"
      ) {
        Object.assign(filteredPhotos, unblurredPhotos);
      }
    }

    try {
      const hasViewed = await hasViewedInLast24Hours(viewerId, candidateId);

      if (!hasViewed) {
        try {
          const viewerIsCandidate =
            viewerId.toString() === candidateId.toString();

          const viewerName = viewer
            ? `${viewer.firstName || ""} ${viewer.lastName || ""}`.trim()
            : "Someone";

          const notificationPayload: any = {
            user: candidateId,
            type: "profile_view",
            title: "Profile Viewed",
            message: `${viewerName} viewed your profile`,
            meta: { viewer: viewerId }
          };

          const weekStart = getWeekStartDate();
          const weekNum = getWeekNumber();

          const tasks: Promise<any>[] = [
            Profile.updateOne(
              { userId: candidateId },
              { $inc: { ProfileViewed: 1 } }
            ),
            ProfileView.updateOne(
              {
                viewer: viewerId,
                candidate: candidateId,
                weekStartDate: weekStart
              },
              {
                $set: {
                  viewedAt: new Date(),
                  weekNumber: weekNum
                },
                $setOnInsert: {
                  viewer: viewerId,
                  candidate: candidateId
                }
              },
              { upsert: true }
            ),
            markProfileViewed(viewerId, candidateId)
          ];

          if (!viewerIsCandidate) {
            tasks.push(Notification.create(notificationPayload));
          }

          await Promise.all(tasks);

          logger.info(
            `Profile view recorded: ${viewerId.toString()} -> ${candidateId.toString()}`
          );
        } catch (err: any) {
          logger.error("Error creating notification for profile view:", {
            error: err.message,
            stack: err.stack
          });
        }
      } else {
        logger.debug(
          `Viewer ${viewerId.toString()} already viewed ${candidateId.toString()} in last 24 hours`
        );
      }
    } catch (err: any) {
      logger.error("Error recording profile view:", {
        error: err.message,
        stack: err.stack
      });
    }
    const isFavorite = !!(
      viewerProfile?.favoriteProfiles &&
      viewerProfile.favoriteProfiles.some(
        (id: any) => id.toString() === candidateId.toString()
      )
    );

    const detailedProfile = await formatDetailedProfile(
      candidate,
      personal,
      education,
      profession,
      family,
      isFavorite,
      health,
      score,
      status
    );

    return {
      ...detailedProfile,
      closerPhoto: filteredPhotos?.closerPhoto ?? null,
      familyPhoto: filteredPhotos?.familyPhoto ?? null,
      otherPhotos: Array.isArray(filteredPhotos?.otherPhotos)
        ? filteredPhotos!.otherPhotos.slice(0, 2)
        : []
    };
  } catch (error: any) {
    logger.error("Error in getDetailedProfile:", {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

// export async function getAllProfilesService(
//   page = 1,
//   limit = 20
// ): Promise<any> {
//   try {
//     const pageNum = Math.max(1, parseInt(page as string) || 1);
//     const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
//     const skip = (pageNum - 1) * limitNum;

//     const [users, personals, profiles] = await Promise.all([
//       User.find({}, "firstName lastName dateOfBirth").lean(),
//       UserPersonal.find({}).lean(),
//       Profile.find({}).lean()
//     ]);

//     const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
//     const personalMap = new Map(
//       personals.map((p: any) => [p.userId.toString(), p])
//     );
//     const profileMap = new Map(
//       profiles.map((p: any) => [p.userId.toString(), p])
//     );

//     const formattedResults = await Promise.all(
//       matches.map((match: any) => {
//         const candidateId = match.user.userId;
//         const user = userMap.get(candidateId);
//         const personal = personalMap.get(candidateId);
//         const profile = profileMap.get(candidateId);

//         if (!user) return null;

//         return formatListingProfile(
//           user,
//           personal,
//           profile,
//           match.scoreDetail || { score: 0, reasons: [] },
//           "none"
//         );
//       })
//     );

//     const validResults = formattedResults.filter((r) => r !== null);
//     const paginatedResults = validResults.slice(skip, skip + limitNum);

//     return  paginatedResults,

//   } catch (error) {
//     logger.error("Error fetching matches:", error);
//   return "Failed to fetch matches"
//   }
// }
