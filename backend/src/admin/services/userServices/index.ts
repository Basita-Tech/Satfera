import { logger } from "../../../lib";
import {
  ConnectionRequest,
  Profile,
  User,
  UserPersonal,
  UserProfession,
  UserSession
} from "../../../models";
import { calculateAge } from "../../../utils/utils";
import { validateUserId } from "../../../services";
import { enqueueProfileReviewEmail } from "../../../lib/queue/enqueue";
import { computeMatchScore } from "../../../services/recommendationService";
import { startOfYear, endOfYear } from "date-fns";

async function updateProfileApproval(
  profileIdOrUserId: string,
  updateData: Record<string, any>,
  successMessage: string,
  sendEmail?: boolean,
  emailType?: "submission" | "approved" | "rejected" | "rectification"
) {
  const objectId = validateUserId(profileIdOrUserId);

  let profile = await Profile.findById(objectId)
    .select("_id userId isProfileApproved profileReviewStatus")
    .lean();
  let userId = profile?.userId;

  if (!profile) {
    profile = await Profile.findOne({ userId: objectId })
      .select("_id userId isProfileApproved profileReviewStatus")
      .lean();
    userId = objectId;
  }

  if (!profile) {
    throw new Error("Profile not found");
  }

  const newStatus = updateData.profileReviewStatus;
  const currentStatus = profile.profileReviewStatus;
  const statusChanged = newStatus !== currentStatus;

  if (!statusChanged) {
    return {
      success: false,
      message: `Profile is already ${currentStatus}.`
    };
  }

  const [updateResult, user] = await Promise.all([
    Profile.findByIdAndUpdate(profile._id, updateData, { new: false }),
    sendEmail
      ? User.findById(userId).select("firstName lastName email").lean()
      : Promise.resolve(null)
  ]);

  if (sendEmail && statusChanged && user && user.email) {
    const reviewType: "submission" | "approved" | "rejected" | "rectification" =
      emailType || (newStatus === "approved" ? "approved" : "rejected");

    try {
      const enqueued = await enqueueProfileReviewEmail(
        userId,
        {
          email: user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || ""
        },
        {
          type: reviewType,
          reason: updateData.reviewNotes,
          dashboardLink: `${process.env.FRONTEND_URL || "https://satfera.in"}/dashboard`
        }
      );

      if (enqueued) {
        logger.info(
          `✉️ Profile review email queued for user ${userId} (${reviewType}) - Status changed from ${currentStatus} to ${newStatus}`
        );
      } else {
        logger.warn(`Failed to queue profile review email for user ${userId}`);
      }
    } catch (queueError: any) {
      logger.error("Error queuing profile review email:", {
        userId,
        type: reviewType,
        error: queueError.message
      });
    }
  } else if (!statusChanged) {
    logger.info(`Profile status unchanged (${currentStatus}), no email sent`);
  }

  return { success: true, message: successMessage };
}

export async function approveUserProfileService(userId: string) {
  try {
    return await updateProfileApproval(
      userId,
      {
        profileReviewStatus: "approved",
        isProfileApproved: true,
        reviewedAt: new Date()
      },
      "Profile approved successfully",
      true
    );
  } catch (error: any) {
    logger.error("Error approving profile:", error);
    throw error;
  }
}

export async function rejectUserProfileService(userId: string, reason: string) {
  try {
    if (!reason) {
      throw new Error("Rejection reason is required");
    }

    return await updateProfileApproval(
      userId,
      {
        profileReviewStatus: "rejected",
        isProfileApproved: false,
        reviewNotes: reason,
        reviewedAt: new Date()
      },
      "Profile rejected successfully",
      true
    );
  } catch (error: any) {
    logger.error("Error rejecting profile:", error);
    throw error;
  }
}

export async function rectifyUserProfileService(
  userId: string,
  reason: string
) {
  try {
    if (!reason) {
      throw new Error("Rectification reason is required");
    }

    return await updateProfileApproval(
      userId,
      {
        profileReviewStatus: "rectification",
        isProfileApproved: false,
        reviewNotes: reason,
        reviewedAt: new Date()
      },
      "Profile sent for rectification successfully",
      true,
      "rectification"
    );
  } catch (error: any) {
    logger.error("Error sending profile for rectification:", error);
    throw error;
  }
}

export async function getPendingProfilesService(page: number, limit: number) {
  const skip = (page - 1) * limit;

  try {
    const totalCount = await Profile.countDocuments({
      profileReviewStatus: "pending"
    });

    const pendingProfiles = await Profile.find({
      profileReviewStatus: "pending"
    })
      .select("photos.closerPhoto userId")
      .skip(skip)
      .limit(limit)
      .lean();

    if (!pendingProfiles || pendingProfiles.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: false
        }
      };
    }

    const userIds = pendingProfiles.map((profile) => profile.userId);

    const [users, professions, personalData] = await Promise.all([
      User.find({
        _id: { $in: userIds }
      })
        .select(
          "firstName lastName gender dateOfBirth phoneNumber email customId"
        )
        .lean(),
      UserProfession.find({ userId: { $in: userIds } })
        .select("Occupation userId")
        .lean(),
      UserPersonal.find({ userId: { $in: userIds } })
        .select("full_address userId")
        .lean()
    ]);

    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const professionMap = new Map();
    professions.forEach((prof) => {
      professionMap.set(prof.userId.toString(), prof);
    });

    const personalMap = new Map();
    personalData.forEach((personal) => {
      personalMap.set(personal.userId.toString(), personal);
    });

    const profilesWithUserData = pendingProfiles.map((profile) => {
      const user = userMap.get(profile.userId.toString());
      const profession = professionMap.get(profile.userId.toString());
      const personal = personalMap.get(profile.userId.toString());

      return {
        profileId: profile._id,
        userId: user._id,
        customId: user?.customId || null,
        firstName: user?.firstName,
        lastName: user?.lastName,
        gender: user?.gender,
        age: calculateAge(user?.dateOfBirth),
        phoneNumber: user?.phoneNumber,
        email: user?.email,
        occupation: profession?.Occupation || null,
        city: personal?.full_address?.city || null,
        state: personal?.full_address?.state || null,
        closerPhoto: profile?.photos?.closerPhoto?.url || null
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page * limit < totalCount;

    return {
      success: true,
      data: profilesWithUserData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore
      }
    };
  } catch (error) {
    logger.error("Error fetching pending profiles:", error);
    return { success: false, message: "Failed to fetch pending profiles" };
  }
}

export async function toggleVerificationService(
  profileIdOrUserId: string,
  makeVerified: boolean
) {
  try {
    const objectId = validateUserId(profileIdOrUserId);

    let profile = await Profile.findById(objectId).select("_id isVerified");

    if (!profile) {
      profile = await Profile.findOne({ userId: objectId }).select(
        "_id isVerified"
      );
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (profile.isVerified === makeVerified) {
      return {
        success: false,
        message: makeVerified
          ? "Profile is already verified"
          : "Profile is already unverified",
        data: { _id: profile._id, isVerified: profile.isVerified }
      };
    }

    const updatedProfile = await Profile.findByIdAndUpdate(
      profile._id,
      { isVerified: makeVerified },
      { new: true }
    ).select("_id isVerified");

    return {
      success: true,
      message: makeVerified
        ? "Profile verified successfully"
        : "Profile unverified successfully",
      data: updatedProfile
    };
  } catch (error: any) {
    logger.error("Verification toggle error:", error);
    throw error;
  }
}

export async function getUserProfileDetailsService(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  try {
    const objectId = validateUserId(userId);

    const [profileDataArray, connectionRequests] = await Promise.all([
      User.aggregate([
        { $match: { _id: objectId } },
        {
          $lookup: {
            from: "profiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile"
          }
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "userhealths",
            localField: "_id",
            foreignField: "userId",
            as: "healthData"
          }
        },
        { $unwind: { path: "$healthData", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "userprofessions",
            localField: "_id",
            foreignField: "userId",
            as: "professionData"
          }
        },
        {
          $unwind: {
            path: "$professionData",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "userpersonals",
            localField: "_id",
            foreignField: "userId",
            as: "personalData"
          }
        },
        {
          $unwind: { path: "$personalData", preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: "userfamilies",
            localField: "_id",
            foreignField: "userId",
            as: "familyData"
          }
        },
        { $unwind: { path: "$familyData", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "usereducations",
            localField: "_id",
            foreignField: "userId",
            as: "educationsData"
          }
        },
        {
          $unwind: {
            path: "$educationsData",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: "userexpectations",
            localField: "_id",
            foreignField: "userId",
            as: "expectationsData"
          }
        },
        {
          $unwind: {
            path: "$expectationsData",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            password: 0,
            __v: 0,
            updatedAt: 0,
            welcomeSent: 0,
            isOnboardingCompleted: 0,
            completedSteps: 0,
            termsAndConditionsAccepted: 0,
            blockedUsers: 0,
            "profile.visibility": 0,
            "profile.verificationStatus": 0,
            "profile.privacy": 0,
            "profile.settings": 0,
            "profile.favoriteProfiles": 0,
            "profile.compareProfiles": 0,
            "profile.photos.closerPhoto.visibility": 0,
            "profile.photos.closerPhoto.uploadedAt": 0,
            "profile.photos.familyPhoto.visibility": 0,
            "profile.photos.familyPhoto.uploadedAt": 0,
            "profile.photos.personalPhotos.visibility": 0,
            "profile.photos.personalPhotos.uploadedAt": 0,
            "profile.photos.otherPhotos.visibility": 0,
            "profile.photos.otherPhotos.uploadedAt": 0
          }
        }
      ] as any),
      ConnectionRequest.find({
        $or: [{ sender: objectId }, { receiver: objectId }]
      })
        .select("sender receiver status createdAt")
        .lean()
    ]);

    const profileDataResult: any = (profileDataArray as any[])[0];

    if (!profileDataResult) {
      throw new Error("User profile not found");
    }

    const profile = profileDataResult.profile || null;
    const healthData = profileDataResult.healthData || null;
    const professionData = profileDataResult.professionData || null;
    const personalData = profileDataResult.personalData || null;
    const familyData = profileDataResult.familyData || null;
    const educationsData = profileDataResult.educationsData || null;
    const expectationsData = profileDataResult.expectationsData || null;

    const user = { ...profileDataResult };
    delete user.profile;
    delete user.healthData;
    delete user.professionData;
    delete user.personalData;
    delete user.familyData;
    delete user.educationsData;
    delete user.expectationsData;

    const requestsSent = connectionRequests.filter(
      (req) => req.sender.toString() === objectId.toString()
    );
    const requestsReceived = connectionRequests.filter(
      (req) => req.receiver.toString() === objectId.toString()
    );

    const sentToUserIds = requestsSent.map((req) => req.receiver);
    const receivedFromUserIds = requestsReceived.map((req) => req.sender);
    const allInvolvedUserIds = [
      ...new Set([...sentToUserIds, ...receivedFromUserIds])
    ].filter((id) => id);

    let userDetailsMap = new Map();

    if (allInvolvedUserIds.length > 0) {
      const allUserDetails = await User.aggregate([
        { $match: { _id: { $in: allInvolvedUserIds } } },
        {
          $lookup: {
            from: "profiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile"
          }
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "userprofessions",
            localField: "_id",
            foreignField: "userId",
            as: "professionData"
          }
        },
        {
          $unwind: {
            path: "$professionData",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            dateOfBirth: 1,
            closerPhoto: "$profile.photos.closerPhoto",
            Occupation: "$professionData.Occupation"
          }
        }
      ]);

      allUserDetails.forEach((d) => userDetailsMap.set(d._id.toString(), d));
    }

    const seeker = user;
    const seekerExpect = expectationsData;

    const buildRequestDetails = async (request: any, targetUserId: any) => {
      const userDetails = userDetailsMap.get(targetUserId.toString());

      let matchScore = 0;
      try {
        const targetUser = await User.findById(targetUserId)
          .select("firstName lastName dateOfBirth gender")
          .lean();

        if (targetUser && seekerExpect) {
          const scoreDetail = await computeMatchScore(objectId, targetUserId, {
            seeker: seeker,
            seekerExpect: seekerExpect,
            candidate: targetUser
          });
          matchScore = scoreDetail?.score || 0;
        }
      } catch (error) {
        logger.warn(`Failed to compute match score for user ${targetUserId}`);
      }

      const closerPhotoData = userDetails?.closerPhoto;
      const cleanedCloserPhoto = closerPhotoData
        ? { url: closerPhotoData.url }
        : null;

      return {
        userId: userDetails?._id || targetUserId || null,
        name: userDetails
          ? `${userDetails.firstName} ${userDetails.lastName}`
          : "Unknown",
        age: userDetails?.dateOfBirth
          ? calculateAge(userDetails.dateOfBirth)
          : null,
        profession: userDetails?.Occupation || null,
        closerPhoto: cleanedCloserPhoto,
        matchPercentage: Math.round(matchScore),
        status: request.status,
        createdAt: request.createdAt
      };
    };

    const requestsSentDetails = await Promise.all(
      requestsSent.map((req) => buildRequestDetails(req, req.receiver))
    );

    const requestsReceivedDetails = await Promise.all(
      requestsReceived.map((req) => buildRequestDetails(req, req.sender))
    );

    const stats = {
      requestsSent: requestsSent.length,
      requestsReceived: requestsReceived.length,
      accepted: connectionRequests.filter((req) => req.status === "accepted")
        .length,
      highMatch: requestsSentDetails.filter((r) => r.matchPercentage > 70)
        .length
    };

    return {
      user,
      profile: profile || null,
      healthData: healthData || null,
      professionData: professionData || null,
      personalData: personalData || null,
      familyData: familyData || null,
      educationsData: educationsData || null,
      expectationsData: expectationsData || null,
      stats,
      requestsSentDetails,
      requestsReceivedDetails
    };
  } catch (error) {
    logger.error("Error fetching user profile details:", error);
    throw error;
  }
}

export async function getAllProfilesService(page: number, limit: number) {
  const skip = (page - 1) * limit;

  try {
    const totalCount = await Profile.countDocuments({});

    const pendingProfiles = await Profile.find({})
      .select("photos.closerPhoto userId")
      .skip(skip)
      .limit(limit)
      .lean();

    if (!pendingProfiles || pendingProfiles.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: false
        }
      };
    }

    const userIds = pendingProfiles.map((profile) => profile.userId);

    const [users, professions] = await Promise.all([
      User.find({
        _id: { $in: userIds }
      })
        .select(
          "firstName lastName gender dateOfBirth phoneNumber email customId createdAt"
        )
        .lean(),
      UserProfession.find({ userId: { $in: userIds } })
        .select("Occupation userId")
        .lean()
    ]);

    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const professionMap = new Map();
    professions.forEach((prof) => {
      professionMap.set(prof.userId.toString(), prof);
    });

    const profilesWithUserData = pendingProfiles.map((profile) => {
      const user = userMap.get(profile.userId.toString());
      const profession = professionMap.get(profile.userId.toString());

      return {
        userId: user._id,
        customId: user?.customId || null,
        firstName: user?.firstName,
        lastName: user?.lastName,
        gender: user?.gender,
        age: calculateAge(user?.dateOfBirth),
        phoneNumber: user?.phoneNumber,
        email: user?.email,
        occupation: profession?.Occupation || null,
        closerPhoto: profile?.photos?.closerPhoto?.url || null,
        createdAt: user?.createdAt
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page * limit < totalCount;

    return {
      success: true,
      data: profilesWithUserData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore
      }
    };
  } catch (error) {
    logger.error("Error fetching pending profiles:", error);
    return { success: false, message: "Failed to fetch pending profiles" };
  }
}

export async function getReportsAndAnalyticsService() {
  try {
    const now = new Date();
    const currentYearStart = startOfYear(now);
    const currentYearEnd = endOfYear(now);

    const [
      userStats,
      registrationTrend,
      profileStats,
      connectionStats,
      sessionStats,
      personalStats
    ] = await Promise.all([
      User.aggregate([
        { $match: { role: "user" } },
        {
          $facet: {
            totalUsers: [{ $count: "count" }],
            activeUsers: [{ $match: { isActive: true } }, { $count: "count" }],
            byGender: [{ $group: { _id: "$gender", count: { $sum: 1 } } }],
            byAge: [
              {
                $project: {
                  age: {
                    $dateDiff: {
                      startDate: "$dateOfBirth",
                      endDate: "$$NOW",
                      unit: "year"
                    }
                  }
                }
              },

              {
                $group: {
                  _id: {
                    $concat: [
                      {
                        $toString: {
                          $multiply: [{ $floor: { $divide: ["$age", 10] } }, 10]
                        }
                      },
                      "s"
                    ]
                  },
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]),

      User.aggregate([
        {
          $match: {
            role: "user",
            createdAt: { $gte: currentYearStart, $lte: currentYearEnd }
          }
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      Profile.aggregate([
        { $group: { _id: "$accountType", count: { $sum: 1 } } }
      ]),

      ConnectionRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      UserSession.aggregate([
        { $group: { _id: "$deviceInfo.device", count: { $sum: 1 } } }
      ]),

      UserPersonal.aggregate([
        { $group: { _id: "$religion", count: { $sum: 1 } } }
      ])
    ]);

    const stats = userStats[0];
    const totalUsers = stats.totalUsers[0]?.count || 0;
    const activeUsers = stats.activeUsers[0]?.count || 0;

    const usersByGender = stats.byGender.reduce((acc: any, curr: any) => {
      acc[curr._id || "Unknown"] = curr.count;
      return acc;
    }, {});

    const usersByAge = stats.byAge.reduce((acc: any, curr: any) => {
      if (curr._id !== "0s" && curr._id !== "NaNs") {
        acc[curr._id] = curr.count;
      }
      return acc;
    }, {});

    let totalProfiles = 0;
    let premiumCount = 0;
    const usersByPlan = profileStats.reduce((acc: any, curr: any) => {
      const plan = curr._id || "free";
      acc[plan] = curr.count;
      totalProfiles += curr.count;
      if (plan === "premium") premiumCount += curr.count;
      return acc;
    }, {});

    const premiumUsersPercentage =
      totalProfiles > 0
        ? Number(((premiumCount / totalProfiles) * 100).toFixed(2))
        : 0;

    const requestMap = connectionStats.reduce((acc: any, curr: any) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const deviceTraffic = sessionStats.reduce((acc: any, curr: any) => {
      acc[curr._id || "Unknown"] = curr.count;
      return acc;
    }, {});

    const usersByReligion = personalStats.reduce((acc: any, curr: any) => {
      acc[curr._id || "Unknown"] = curr.count;
      return acc;
    }, {});

    const userRegistrationTrend = Array.from({ length: 12 }, (_, i) => {
      const monthData = registrationTrend.find((d: any) => d._id === i + 1);
      return { month: i + 1, count: monthData ? monthData.count : 0 };
    });

    return {
      totalUsers,
      activeUsers,
      premiumUsersPercentage,
      pendingRequests: requestMap["pending"] || 0,
      acceptedRequests: requestMap["accepted"] || 0,
      deviceTraffic,
      usersByGender,
      usersByReligion,
      usersByAge,
      usersByPlan,
      userRegistrationTrend
    };
  } catch (error) {
    logger.error("Error fetching reports and analytics:", error);
    return { success: false, message: "Failed to fetch reports and analytics" };
  }
}

export async function getAllRequestsService(page: number, limit: number) {
  const skip = (page - 1) * limit;

  try {
    const totalCount = await ConnectionRequest.countDocuments({});

    const requests = await ConnectionRequest.aggregate([
      { $skip: skip },
      { $limit: limit },

      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderUser"
        }
      },

      { $unwind: { path: "$senderUser", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "receiver",
          foreignField: "_id",
          as: "receiverUser"
        }
      },

      { $unwind: { path: "$receiverUser", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "profiles",
          localField: "sender",
          foreignField: "userId",
          as: "senderProfile"
        }
      },

      { $unwind: { path: "$senderProfile", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "profiles",
          localField: "receiver",
          foreignField: "userId",
          as: "receiverProfile"
        }
      },

      {
        $unwind: { path: "$receiverProfile", preserveNullAndEmptyArrays: true }
      },

      {
        $project: {
          _id: 0,
          status: "$status",
          createdAt: "$createdAt",
          sender: {
            userId: "$sender",
            name: {
              $concat: ["$senderUser.firstName", " ", "$senderUser.lastName"]
            },
            dateOfBirth: "$senderUser.dateOfBirth",
            gender: "$senderUser.gender",
            closerPhoto: "$senderProfile.photos.closerPhoto.url"
          },
          receiver: {
            userId: "$receiver",
            name: {
              $concat: [
                "$receiverUser.firstName",
                " ",
                "$receiverUser.lastName"
              ]
            },
            dateOfBirth: "$receiverUser.dateOfBirth",
            gender: "$receiverUser.gender",
            closerPhoto: "$receiverProfile.photos.closerPhoto.url"
          }
        }
      }
    ]);

    const requestsWithUserData = requests.map((request) => ({
      status: request.status,
      createdAt: request.createdAt,
      sender: {
        ...request.sender,
        name: request.sender.name || "Unknown",
        age: request.sender.dateOfBirth
          ? calculateAge(request.sender.dateOfBirth)
          : null
      },
      receiver: {
        ...request.receiver,
        name: request.receiver.name || "Unknown",
        age: request.receiver.dateOfBirth
          ? calculateAge(request.receiver.dateOfBirth)
          : null
      }
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page * limit < totalCount;

    return {
      success: true,
      data: requestsWithUserData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore
      }
    };
  } catch (error) {
    logger.error("Error fetching all requests:", error);
    return { success: false, message: "Failed to fetch all requests" };
  }
}
