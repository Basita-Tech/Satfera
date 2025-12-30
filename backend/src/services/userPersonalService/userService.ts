import mongoose from "mongoose";
import { formatListingProfile, logger } from "../../lib";
import {
  User,
  UserEducation,
  UserFamily,
  UserHealth,
  UserPersonal,
  UserProfession,
  Profile,
  ConnectionRequest,
  ProfileView
} from "../../models";
import { calculateAge, isAffirmative } from "../../utils/utils";
import { computeMatchScore } from "../recommendationService";
import { validateUserId } from "./userSettingService";

export async function getUserDashboardService(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const queryStart = Date.now();

  const result = await User.aggregate([
    { $match: { _id: userObjectId } },
    {
      $lookup: {
        from: "userpersonals",
        localField: "_id",
        foreignField: "userId",
        pipeline: [{ $project: { "full_address.city": 1 } }],
        as: "personal"
      }
    },
    {
      $lookup: {
        from: "profiles",
        localField: "_id",
        foreignField: "userId",
        pipeline: [
          {
            $project: {
              "photos.closerPhoto.url": 1,
              favoriteProfiles: 1,
              isVerified: 1,
              ProfileViewed: 1
            }
          }
        ],
        as: "profile"
      }
    },
    {
      $lookup: {
        from: "userprofessions",
        localField: "_id",
        foreignField: "userId",
        pipeline: [{ $project: { Occupation: 1 } }],
        as: "profession"
      }
    },
    {
      $lookup: {
        from: "connectionrequests",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$sender", "$$userId"] },
                  { $eq: ["$status", "pending"] }
                ]
              }
            }
          },
          { $count: "count" }
        ],
        as: "sentRequests"
      }
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        dateOfBirth: 1,
        planExpiry: 1,
        customId: 1,
        city: { $arrayElemAt: ["$personal.full_address.city", 0] },
        closerPhotoUrl: {
          $arrayElemAt: ["$profile.photos.closerPhoto.url", 0]
        },
        accountType: 1,
        isVerified: { $arrayElemAt: ["$profile.isVerified", 0] },
        profileViewsCount: { $arrayElemAt: ["$profile.ProfileViewed", 0] },
        favoriteProfiles: { $arrayElemAt: ["$profile.favoriteProfiles", 0] },
        occupation: { $arrayElemAt: ["$profession.Occupation", 0] },
        sentRequestsCount: {
          $ifNull: [{ $arrayElemAt: ["$sentRequests.count", 0] }, 0]
        }
      }
    }
  ])
    .allowDiskUse(true)
    .exec();

  const queryTime = Date.now() - queryStart;
  logger.info(
    `Dashboard aggregation query took ${queryTime}ms for user ${userId}`
  );

  if (!result || result.length === 0) {
    throw new Error("User or profile data not found");
  }

  const data = result[0];
  const age = data.dateOfBirth ? calculateAge(data.dateOfBirth) : null;

  return {
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    age: age,
    planExpiry: data.planExpiry
      ? new Date(data.planExpiry).toISOString()
      : null,
    closerPhotoUrl: data.closerPhotoUrl || null,
    city: data.city || null,
    occupation: data.occupation || null,
    accountType: data.accountType || "free",
    isVerified: data.isVerified || false,
    interestSentCount: data.sentRequestsCount || 0,
    profileViewsCount: data.profileViewsCount || 0,
    shortListedCount: data.favoriteProfiles?.length || 0,
    userId: data.customId || null
  };
}

export async function getUserProfileViewsService(
  userId: string,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  const pipeline: any[] = [
    { $match: { candidate: new (require("mongoose").Types.ObjectId)(userId) } },
    { $sort: { viewedAt: -1 } },
    { $group: { _id: "$viewer", lastViewedAt: { $first: "$viewedAt" } } },
    { $sort: { lastViewedAt: -1 } },
    {
      $facet: {
        results: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }]
      }
    }
  ];

  const agg = await ProfileView.aggregate(pipeline).allowDiskUse(true).exec();
  const results = (agg[0] && agg[0].results) || [];
  const total =
    (agg[0] &&
      agg[0].totalCount &&
      agg[0].totalCount[0] &&
      agg[0].totalCount[0].count) ||
    0;

  const viewerIds = results.map((r: any) => String(r._id));

  const [users, personals, profiles, professions, profileViewDoc] =
    await Promise.all([
      User.find(
        { _id: { $in: viewerIds } },
        "firstName lastName dateOfBirth createdAt customId"
      ).lean(),
      UserPersonal.find({ userId: { $in: viewerIds } })
        .select(
          "userId full_address.city full_address.state residingCountry religion subCaste"
        )
        .lean(),
      Profile.find({ userId: { $in: viewerIds } })
        .select("userId favoriteProfiles photos.closerPhoto.url")
        .lean(),
      UserProfession.find({ userId: { $in: viewerIds } })
        .select("userId Occupation")
        .lean(),
      Profile.findOne({ userId }).select("ProfileViewed").lean()
    ]);

  const userMap = new Map(users.map((u: any) => [String(u._id), u]));
  const personalMap = new Map(
    (personals || []).map((p: any) => [String(p.userId), p])
  );
  const profileMap = new Map(
    (profiles || []).map((p: any) => [String(p.userId), p])
  );
  const professionMap = new Map(
    (professions || []).map((p: any) => [String(p.userId), p])
  );

  const listings = results.map((r: any) => {
    const vid = String(r._id);
    const user = userMap.get(vid);
    if (!user) return null;
    const personal = personalMap.get(vid) || null;
    const profile = profileMap.get(vid) || null;
    const profession = professionMap.get(vid) || null;
    return formatListingProfile(
      user,
      personal,
      profile,
      profession,
      { score: 0, reasons: [] },
      null
    );
  });

  const validResults = (await Promise.all(listings)).filter(
    (x: any) => x !== null
  );

  return {
    data: validResults,
    pagination: {
      total,
      page,
      limit,
      hasMore: skip + validResults.length < total
    },
    profileViewCount:
      (profileViewDoc && (profileViewDoc as any).ProfileViewed) || 0
  };
}

export async function compareProfilesService(
  profilesIds: string[],
  authUserId: string | null
) {
  const [authUser, authPersonal, authProfession] = await Promise.all([
    User.findById(authUserId).lean(),
    UserPersonal.findOne({ userId: authUserId }).lean(),
    UserProfession.findOne({ userId: authUserId }).lean()
  ]);

  const [
    users,
    personals,
    families,
    healths,
    professions,
    educations,
    profiles
  ] = await Promise.all([
    User.find(
      { _id: { $in: profilesIds } },
      "_id firstName lastName dateOfBirth"
    ).lean(),
    UserPersonal.find(
      { userId: { $in: profilesIds } },
      "userId height weight full_address.city religion subCaste"
    ).lean(),
    UserFamily.find(
      { userId: { $in: profilesIds } },
      "userId familyType"
    ).lean(),
    UserHealth.find(
      { userId: { $in: profilesIds } },
      "userId diet isAlcoholic isTobaccoUser"
    ).lean(),
    UserProfession.find(
      { userId: { $in: profilesIds } },
      "userId Occupation"
    ).lean(),
    UserEducation.find(
      { userId: { $in: profilesIds } },
      "userId HighestEducation FieldOfStudy"
    ).lean(),
    Profile.find(
      { userId: { $in: profilesIds } },
      "userId photos.closerPhoto.url"
    ).lean()
  ]);

  const usersMap = new Map(users.map((u: any) => [String(u._id), u]));
  const personalMap = new Map(
    (personals || []).map((p: any) => [String(p.userId), p])
  );
  const familyMap = new Map(
    (families || []).map((f: any) => [String(f.userId), f])
  );
  const healthMap = new Map(
    (healths || []).map((h: any) => [String(h.userId), h])
  );
  const professionMap = new Map(
    (professions || []).map((p: any) => [String(p.userId), p])
  );
  const educationMap = new Map(
    (educations || []).map((e: any) => [String(e.userId), e])
  );
  const profileMap = new Map(
    (profiles || []).map((pr: any) => [String(pr.userId), pr])
  );

  const compareData = await Promise.all(
    profilesIds.map(async (id: string) => {
      const u = usersMap.get(id) || null;
      const p = personalMap.get(id) || null;
      const f = familyMap.get(id) || null;
      const h = healthMap.get(id) || null;
      const prof = professionMap.get(id) || null;
      const edu = educationMap.get(id) || null;
      const pr = profileMap.get(id) || null;

      let compatibility = null;
      try {
        const seeker = authUser?._id ? authUser._id : authUserId;
        const candidateId = u?._id ? u._id : id;
        const scoreDetail = await computeMatchScore(
          seeker as any,
          candidateId as any,
          {
            seeker: authUser || undefined,
            seekerExpect: undefined,
            candidate: u || undefined,
            candidatePersonal: p || undefined,
            candidateHealth: h || undefined,
            candidateEducation: edu || undefined,
            candidateProfession: prof || undefined
          }
        );
        compatibility = scoreDetail ? scoreDetail.score : null;
      } catch (e) {
        compatibility = null;
      }

      return {
        userId: id,
        fullName: u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : null,
        age: u ? calculateAge(u.dateOfBirth) : null,
        height: p?.height ?? null,
        weight: p?.weight ?? null,
        city: p?.full_address?.city || null,
        religion: p?.religion || null,
        caste: p?.subCaste || null,
        education: edu?.HighestEducation || null,
        fieldOfStudy: edu?.FieldOfStudy || null,
        profession: prof?.Occupation || null,
        diet: h?.diet || null,
        smoking: h?.isTobaccoUser || null,
        drinking: h?.isAlcoholic || null,
        familyType: f?.familyType || null,
        closerPhoto: {
          url: pr?.photos?.closerPhoto?.url || null
        },
        compatibility
      };
    })
  );

  return compareData;
}

export async function addCompareProfilesToProfile(
  userId: string,
  profilesIds: string[]
) {
  if (!Array.isArray(profilesIds) || profilesIds.length === 0) {
    throw new Error("profilesIds must be a non-empty array");
  }

  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new Error("Profile not found");
  }

  const existing = (
    await Profile.findOne({ userId }).select("compareProfiles")
  ).compareProfiles.map(String);

  const toAdd = Array.from(new Set(profilesIds.map(String))).filter(
    (id) => !existing.includes(id)
  );
  const final = Array.from(new Set([...existing, ...toAdd]));
  if (final.length > 5) {
    throw new Error("LimitExceeded: You can compare up to 5 profiles only");
  }

  await Profile.updateOne({ userId }, { $set: { compareProfiles: final } });
  return final;
}

export async function getCompareProfilesForUser(userId: string) {
  const p = await Profile.findOne({ userId }).select("compareProfiles").lean();
  const arr = (p && (p as any).compareProfiles) || [];
  return (arr || []).map((v: any) => String(v));
}

export async function removeCompareProfilesFromProfile(
  userId: string,
  profilesIds: string[]
) {
  if (!Array.isArray(profilesIds) || profilesIds.length === 0) {
    throw new Error("profilesIds must be a non-empty array");
  }

  await Profile.updateOne(
    { userId },
    { $pull: { compareProfiles: { $in: profilesIds } } }
  );

  return;
}

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export async function searchService(
  filters: {
    name?: string;
    newProfile?: "all" | "last1week" | "last3week" | "last1month";
    ageFrom?: number;
    ageTo?: number;
    heightFrom?: number;
    heightTo?: number;
    weightFrom?: number;
    weightTo?: number;
    religion?: string;
    caste?: string;
    city?: string;
    state?: string;
    country?: string;
    education?: string;
    profession?: string;
    gender?: string;
    sortBy?: string;
    customId?: string;
  } = {},
  page = 1,
  limit = 20,
  authUserId?: string
) {
  const match: any = {
    isActive: true,
    isDeleted: false,
    isVisible: true,
    isProfileApproved: true,
    profileReviewStatus: "approved"
  };

  const now = new Date();

  let authUserGender: string | null = null;
  let authUserHasHIV = false;
  const excludedUserIds: string[] = [];

  if (authUserId) {
    const [
      authUser,
      authUserFavoritesProfiles,
      authHealth,
      authUserSentRequests,
      authUserReceivedRequests
    ] = await Promise.all([
      User.findById(authUserId, "gender blockedUsers").lean(),
      Profile.findOne({ userId: authUserId }, "favoriteProfiles").lean(),
      UserHealth.findOne({ userId: authUserId }, "isHaveHIV").lean(),
      ConnectionRequest.find({ sender: authUserId }).lean(),
      ConnectionRequest.find({ receiver: authUserId }).lean()
    ]);

    if (authUser) {
      authUserGender = String(authUser.gender);
      authUserHasHIV =
        authHealth && isAffirmative((authHealth as any).isHaveHIV);

      const excludedFavoriteIds = (
        (authUserFavoritesProfiles as any)?.favoriteProfiles || []
      ).map((id: any) => String(id));
      excludedUserIds.push(...excludedFavoriteIds);

      const excludedSentRequestIds = (authUserSentRequests || []).map((req) =>
        String(req.receiver)
      );
      excludedUserIds.push(...excludedSentRequestIds);

      const excludedReceivedRequestIds = (authUserReceivedRequests || []).map(
        (req) => String(req.sender)
      );
      excludedUserIds.push(...excludedReceivedRequestIds);

      const blockedUsers = ((authUser as any)?.blockedUsers || []).map(
        (id: any) => String(id)
      );
      excludedUserIds.push(...blockedUsers);

      const uniqueExcludedIds = [...new Set(excludedUserIds)];
      if (uniqueExcludedIds.length > 0) {
        match._id = match._id || {};
        match._id.$nin = uniqueExcludedIds.map(
          (id: string) => new mongoose.Types.ObjectId(id)
        );
      }

      match.blockedUsers = { $ne: new mongoose.Types.ObjectId(authUserId) };
    }
  }

  if (authUserGender) {
    const oppositeGender = authUserGender === "male" ? "female" : "male";
    match.gender = String(oppositeGender);
  } else if (filters.gender) {
    match.gender = String(filters.gender);
  }

  if (filters.name) {
    const nameRegex = new RegExp(escapeRegex(filters.name), "i");
    match.$or = [
      { firstName: { $regex: nameRegex } },
      { lastName: { $regex: nameRegex } },
      { middleName: { $regex: nameRegex } }
    ];
  }

  if (filters.customId) {
    const customIdRegex = new RegExp(`^${escapeRegex(filters.customId)}$`, "i");
    match.customId = { $regex: customIdRegex };
  }

  if (filters.newProfile && filters.newProfile !== "all") {
    const daysMap: Record<string, number> = {
      last1week: 7,
      last3week: 21,
      last1month: 30
    };
    const days = daysMap[filters.newProfile] || 0;
    if (days > 0) {
      const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      match.createdAt = { $gte: since };
    }
  }

  if (
    typeof filters.ageFrom === "number" ||
    typeof filters.ageTo === "number"
  ) {
    const ageFrom = typeof filters.ageFrom === "number" ? filters.ageFrom : 0;
    const ageTo = typeof filters.ageTo === "number" ? filters.ageTo : 120;
    const fromDate = new Date(
      now.getFullYear() - ageTo,
      now.getMonth(),
      now.getDate()
    );
    const toDate = new Date(
      now.getFullYear() - ageFrom,
      now.getMonth(),
      now.getDate()
    );
    match.dateOfBirth = { $gte: fromDate, $lte: toDate };
  }

  if (authUserId && mongoose.Types.ObjectId.isValid(authUserId)) {
    const authObjId = new mongoose.Types.ObjectId(authUserId);
    match._id = match._id || {};
    match._id.$ne = authObjId;
  }

  const pipeline: any[] = [{ $match: match }];

  pipeline.push(
    {
      $lookup: {
        from: UserPersonal.collection.name,
        localField: "_id",
        foreignField: "userId",
        as: "personal"
      }
    },
    { $unwind: { path: "$personal", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: UserProfession.collection.name,
        localField: "_id",
        foreignField: "userId",
        as: "profession"
      }
    },
    { $unwind: { path: "$profession", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Profile.collection.name,
        localField: "_id",
        foreignField: "userId",
        as: "profile"
      }
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: UserEducation.collection.name,
        localField: "_id",
        foreignField: "userId",
        as: "education"
      }
    },
    { $unwind: { path: "$education", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: UserHealth.collection.name,
        localField: "_id",
        foreignField: "userId",
        as: "health"
      }
    },
    { $unwind: { path: "$health", preserveNullAndEmptyArrays: true } }
  );

  const postMatch: any = {};

  if (authUserId) {
    if (authUserHasHIV) {
      postMatch["health.isHaveHIV"] = { $in: ["yes", "Yes", "YES", true] };
    } else {
      postMatch.$or = [
        { "health.isHaveHIV": { $exists: false } },
        { "health.isHaveHIV": null },
        { "health.isHaveHIV": { $nin: ["yes", "Yes", "YES", true] } }
      ];
    }
  }

  if (
    typeof filters.heightFrom === "number" ||
    typeof filters.heightTo === "number"
  ) {
    const hFrom =
      typeof filters.heightFrom === "number" ? filters.heightFrom : 0;
    const hTo = typeof filters.heightTo === "number" ? filters.heightTo : 999;

    const heightValue = {
      $let: {
        vars: {
          heightStr: { $toString: { $ifNull: ["$personal.height", "0"] } },
          cmMatch: {
            $regexFind: {
              input: { $toString: { $ifNull: ["$personal.height", "0"] } },
              regex: "(\\d+(?:\\.\\d+)?)\\s*cm",
              options: "i"
            }
          }
        },
        in: {
          $cond: {
            if: { $ne: ["$$cmMatch", null] },
            then: {
              $convert: {
                input: {
                  $arrayElemAt: ["$$cmMatch.captures", 0]
                },
                to: "double",
                onError: 0,
                onNull: 0
              }
            },
            else: {
              $convert: {
                input: "$$heightStr",
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    };

    postMatch.$and = postMatch.$and || [];
    postMatch.$and.push({
      $expr: {
        $and: [
          { $gte: [heightValue, hFrom] },
          { $lte: [heightValue, hTo] },
          { $gt: [heightValue, 0] }
        ]
      }
    });
  }

  if (filters.religion) {
    postMatch["personal.religion"] = {
      $regex: new RegExp(escapeRegex(filters.religion), "i")
    };
  }

  if (filters.caste) {
    postMatch["personal.subCaste"] = {
      $regex: new RegExp(escapeRegex(filters.caste), "i")
    };
  }

  if (filters.city) {
    postMatch["personal.full_address.city"] = {
      $regex: new RegExp(escapeRegex(filters.city), "i")
    };
  }

  if (filters.state) {
    postMatch["personal.full_address.state"] = {
      $regex: new RegExp(escapeRegex(filters.state), "i")
    };
  }

  if (filters.country) {
    postMatch["personal.residingCountry"] = {
      $regex: new RegExp(escapeRegex(filters.country), "i")
    };
  }

  if (filters.profession) {
    postMatch.$and = postMatch.$and || [];
    postMatch.$and.push({
      $or: [
        {
          "profession.Occupation": {
            $regex: new RegExp(escapeRegex(filters.profession), "i")
          }
        },
        {
          "profession.OrganizationName": {
            $regex: new RegExp(escapeRegex(filters.profession), "i")
          }
        }
      ]
    });
  }

  if (filters.education) {
    const eduRegex = new RegExp(escapeRegex(filters.education), "i");
    postMatch.$and = postMatch.$and || [];
    postMatch.$and.push({
      $or: [
        { "education.HighestEducation": { $regex: eduRegex } },
        { "education.FieldOfStudy": { $regex: eduRegex } }
      ]
    });
  }

  if (
    typeof filters.weightFrom === "number" ||
    typeof filters.weightTo === "number"
  ) {
    const wFrom =
      typeof filters.weightFrom === "number" ? filters.weightFrom : 0;
    const wTo = typeof filters.weightTo === "number" ? filters.weightTo : 999;

    const weightValue = {
      $let: {
        vars: {
          weightStr: { $toString: { $ifNull: ["$personal.weight", "0"] } },
          kgMatch: {
            $regexFind: {
              input: { $toString: { $ifNull: ["$personal.weight", "0"] } },
              regex: "(\\d+(?:\\.\\d+)?)\\s*kg",
              options: "i"
            }
          }
        },
        in: {
          $cond: {
            if: { $ne: ["$$kgMatch", null] },
            then: {
              $convert: {
                input: {
                  $arrayElemAt: ["$$kgMatch.captures", 0]
                },
                to: "double",
                onError: 0,
                onNull: 0
              }
            },
            else: {
              $convert: {
                input: "$$weightStr",
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    };

    postMatch.$and = postMatch.$and || [];
    postMatch.$and.push({
      $expr: {
        $and: [
          { $gte: [weightValue, wFrom] },
          { $lte: [weightValue, wTo] },
          { $gt: [weightValue, 0] }
        ]
      }
    });
  }

  if (Object.keys(postMatch).length > 0) pipeline.push({ $match: postMatch });

  pipeline.push({
    $project: {
      _id: 1,
      firstName: 1,
      lastName: 1,
      dateOfBirth: 1,
      gender: 1,
      createdAt: 1,
      personal: 1,
      profession: 1,
      profile: 1
    }
  });

  if (filters.sortBy === "age") {
    pipeline.push({ $sort: { dateOfBirth: -1 } });
  } else if (filters.sortBy === "newest") {
    pipeline.push({ $sort: { createdAt: -1 } });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  pipeline.push({
    $facet: {
      results: [{ $skip: skip }, { $limit: Math.max(1, limit) }],
      totalCount: [{ $count: "count" }]
    }
  });

  const agg = User.aggregate(pipeline);
  const res = (await agg.exec()) as any[];

  let results = res[0]?.results || [];
  const total = res[0]?.totalCount?.[0]?.count || 0;

  const listings = await Promise.all(
    results.map(async (r: any) => {
      const candidate = {
        _id: r._id,
        firstName: r.firstName,
        lastName: r.lastName,
        dateOfBirth: r.dateOfBirth,
        gender: r.gender,
        createdAt: r.createdAt
      };

      const personal = r.personal || null;
      const profile = r.profile || null;
      const profession = r.profession || null;
      const scoreDetail = { score: 0, reasons: [] };

      const listing = await formatListingProfile(
        candidate,
        personal,
        profile,
        profession,
        scoreDetail,
        null
      );
      return listing;
    })
  );

  return {
    data: listings,
    pagination: {
      page: Math.max(1, page),
      limit: Math.max(1, limit),
      total,
      hasMore: skip + listings.length < total
    }
  };
}

export async function downloadMyPdfData(userId: string) {
  try {
    const userObjectId = validateUserId(userId);

    const [user, userPersonal, userFamily, educations, profession, profile] =
      await Promise.all([
        User.findById(userObjectId)
          .select(
            "firstName middleName lastName gender phoneNumber email dateOfBirth customId"
          )
          .lean(),
        UserPersonal.findOne({ userId: userObjectId })
          .select("-createdAt -updatedAt -__v")
          .lean(),
        UserFamily.findOne({ userId: userObjectId })
          .select("-createdAt -updatedAt -__v")
          .lean(),
        UserEducation.find({ userId: userObjectId })
          .select("-createdAt -updatedAt -__v")
          .lean(),
        UserProfession.findOne({ userId: userObjectId })
          .select("-createdAt -updatedAt -__v")
          .lean(),
        Profile.findOne({ userId: userObjectId })
          .select("photos.closerPhoto.url ")
          .lean()
      ]);

    return {
      user: user || null,
      userPersonal: userPersonal || null,
      family: userFamily || null,
      educations: Array.isArray(educations) ? educations : [],
      profession: profession || null,
      closerPhoto:
        (Array.isArray(profile)
          ? profile[0]?.photos?.closerPhoto
          : (profile as any)?.photos?.closerPhoto) || null
    };
  } catch (error: any) {
    logger.error("Error in downloadMyPdfData:", error?.message || error);
    throw error;
  }
}
