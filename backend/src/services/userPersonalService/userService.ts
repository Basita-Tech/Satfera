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
  Notification,
  ProfileView
} from "../../models";
import { calculateAge } from "../../utils/utils";
import { computeMatchScore } from "../recommendationService";
import bcrypt from "bcryptjs";

export async function getUserDashboardService(userId: string) {
  const [user, userPersonal, userProfile, userProfession, sentRequests] =
    await Promise.all([
      User.findById(userId, "firstName lastName dateOfBirth").lean(),
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
    shortListedCount: profile.favoriteProfiles?.length || 0
  };
  return dashboardData;
}

export async function changeUserPasswordService(
  userId: string,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  if (!userId) {
    return {
      success: false,
      message: "Authentication required"
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      message: "New password and confirm password do not match"
    };
  }

  try {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return {
        success: false,
        message: "User not found"
      };
    }

    if (!oldPassword) {
      return {
        success: false,
        message: "Old password is required"
      };
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return {
        success: false,
        message: "Old password is incorrect"
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    try {
      await Notification.create({
        user: user._id,
        type: "system",
        title: "Your password has been changed",
        message:
          "If you did not perform this action, please contact support immediately.",
        isRead: false
      });
    } catch (notifyErr: any) {
      logger.warn(
        "Failed to create password change notification:",
        notifyErr.message
      );
    }
    return {
      success: true,
      message: "Password changed successfully"
    };
  } catch (error: any) {
    logger.error("Error changing user password:", {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      message: "Failed to change password"
    };
  }
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

  const [users, personals, profiles, profileViewDoc] = await Promise.all([
    User.find(
      { _id: { $in: viewerIds } },
      "firstName lastName dateOfBirth createdAt customId"
    ).lean(),
    UserPersonal.find({ userId: { $in: viewerIds } }).lean(),
    Profile.find({ userId: { $in: viewerIds } }).lean(),
    Profile.findOne({ userId }).select("ProfileViewed").lean()
  ]);

  const userMap = new Map(users.map((u: any) => [String(u._id), u]));
  const personalMap = new Map(
    (personals || []).map((p: any) => [String(p.userId), p])
  );
  const profileMap = new Map(
    (profiles || []).map((p: any) => [String(p.userId), p])
  );

  const listings = results.map((r: any) => {
    const vid = String(r._id);
    const user = userMap.get(vid);
    if (!user) return null;
    const personal = personalMap.get(vid) || null;
    const profile = profileMap.get(vid) || null;
    return formatListingProfile(
      user,
      personal,
      profile,
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

  const [users, personals, families, healths, professions, educations] =
    await Promise.all([
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

  const compareData = await Promise.all(
    profilesIds.map(async (id: string) => {
      const u = usersMap.get(id) || null;
      const p = personalMap.get(id) || null;
      const f = familyMap.get(id) || null;
      const h = healthMap.get(id) || null;
      const prof = professionMap.get(id) || null;
      const edu = educationMap.get(id) || null;

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
