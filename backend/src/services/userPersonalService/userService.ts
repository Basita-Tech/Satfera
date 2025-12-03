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
  const [user, userPersonal, userProfile, userProfession, sentRequests] =
    await Promise.all([
      User.findById(userId, "firstName lastName dateOfBirth customId").lean(),
      UserPersonal.findOne({ userId }, "full_address.city").lean(),
      Profile.findOne(
        { userId },
        "photos.closerPhoto favoriteProfiles isVerified ProfileViewed accountType"
      ).lean(),
      UserProfession.findOne({ userId }, "Occupation").lean(),
      ConnectionRequest.countDocuments({ sender: userId, status: "pending" })
    ]);

  if (!user || !userProfile) {
    throw new Error("User or profile data not found");
  }

  const profile = userProfile as any;
  const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;

  const dashboardData = {
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    age: age,
    closerPhotoUrl: profile.photos?.closerPhoto?.url || null,
    city: userPersonal?.full_address?.city || null,
    occupation: userProfession?.Occupation || null,
    accountType: profile.accountType || "free",
    isVerified: profile.isVerified || false,
    interestSentCount: sentRequests || 0,
    profileViewsCount: profile.ProfileViewed || 0,
    shortListedCount: profile.favoriteProfiles?.length || 0,
    userId: user.customId || null
  };
  return dashboardData;
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

export async function searchService(
  filters: {
    name?: string;
    newProfile?: "all" | "last1week" | "last3week" | "last1month";
    ageFrom?: number;
    ageTo?: number;
    heightFrom?: number;
    heightTo?: number;
    religion?: string;
    caste?: string;
    city?: string;
    profession?: string;
    gender?: string;
    sortBy?: string;
    customId?: string;
  } = {},
  page = 1,
  limit = 20,
  authUserId?: string
) {
  const match: any = { isActive: true };

  const now = new Date();

  if (filters.gender) {
    match.gender = String(filters.gender);
  }

  if (filters.name) {
    const nameRegex = new RegExp(filters.name, "i");
    match.$or = [
      { firstName: { $regex: nameRegex } },
      { lastName: { $regex: nameRegex } },
      { middleName: { $regex: nameRegex } }
    ];
  }

  if (filters.customId) {
    const customIdRegex = new RegExp(`^${filters.customId}$`, "i");
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

  const pipeline: any[] = [{ $match: match }];

  if (authUserId && mongoose.Types.ObjectId.isValid(authUserId)) {
    const authObjId = new mongoose.Types.ObjectId(authUserId);
    try {
      const [authUser, authHealth] = await Promise.all([
        User.findById(authObjId).select("blockedUsers").lean(),
        UserHealth.findOne({ userId: authObjId }).select("isHaveHIV").lean()
      ]);
      const blockedIds: any[] = (authUser as any)?.blockedUsers || [];
      if (blockedIds.length > 0) {
        match._id = match._id || {};
        match._id.$nin = blockedIds;
      }

      match.blockedUsers = { $ne: authObjId };
      const seekerHasAffirm =
        authHealth && isAffirmative((authHealth as any).isHaveHIV);
      const seekerHasNegative =
        authHealth && !isAffirmative((authHealth as any).isHaveHIV);
      if (seekerHasAffirm) {
        match._seekerHIV = "positive";
      } else if (seekerHasNegative) {
        match._seekerHIV = "negative";
      }
    } catch (e) {}
  }

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
        from: UserHealth.collection.name,
        localField: "_id",
        foreignField: "userId",
        as: "health"
      }
    },
    { $unwind: { path: "$health", preserveNullAndEmptyArrays: true } }
  );

  const postMatch: any = {};

  if (
    typeof filters.heightFrom === "number" ||
    typeof filters.heightTo === "number"
  ) {
    const hFrom =
      typeof filters.heightFrom === "number" ? filters.heightFrom : -Infinity;
    const hTo =
      typeof filters.heightTo === "number" ? filters.heightTo : Infinity;
    postMatch.$and = postMatch.$and || [];
    postMatch.$and.push({
      $expr: {
        $and: [
          {
            $gte: [{ $toDouble: { $ifNull: ["$personal.height", 0] } }, hFrom]
          },
          { $lte: [{ $toDouble: { $ifNull: ["$personal.height", 0] } }, hTo] }
        ]
      }
    });
  }

  if (filters.religion) {
    postMatch["personal.religion"] = {
      $regex: new RegExp(filters.religion, "i")
    };
  }

  if (filters.caste) {
    postMatch["personal.subCaste"] = { $regex: new RegExp(filters.caste, "i") };
  }

  if (filters.city) {
    postMatch["personal.full_address.city"] = {
      $regex: new RegExp(filters.city, "i")
    };
  }

  if (filters.profession) {
    postMatch.$or = postMatch.$or || [];
    postMatch.$or.push({
      "profession.Occupation": { $regex: new RegExp(filters.profession, "i") }
    });
    postMatch.$or.push({
      "profession.OrganizationName": {
        $regex: new RegExp(filters.profession, "i")
      }
    });
  }

  if (Object.keys(postMatch).length > 0) pipeline.push({ $match: postMatch });

  const seekerHIVFilter = (match as any)._seekerHIV;
  if (seekerHIVFilter === "positive") {
    pipeline.push({
      $match: {
        $or: [
          { "health.isHaveHIV": true },
          { "health.isHaveHIV": "true" },
          { "health.isHaveHIV": "yes" },
          { "health.isHaveHIV": "1" },
          { "health.isHaveHIV": 1 }
        ]
      }
    });
  } else if (seekerHIVFilter === "negative") {
    // seeker explicitly negative -> include ONLY explicit negative health values
    pipeline.push({
      $match: {
        "health.isHaveHIV": { $in: [false, "false", "no", "0", 0] }
      }
    });
  }

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

  const results = (res[0] && res[0].results) || [];
  const total =
    (res[0] &&
      res[0].totalCount &&
      res[0].totalCount[0] &&
      res[0].totalCount[0].count) ||
    0;

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
