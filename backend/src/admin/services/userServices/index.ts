import { logger } from "../../../lib";
import {
  ConnectionRequest,
  Profile,
  User,
  UserPersonal,
  UserProfession,
  UserSession
} from "../../../models";
import { Payment } from "../../../models";
import { validateUserId } from "../../../services";
import { enqueueProfileReviewEmail } from "../../../lib/queue/enqueue";
import { computeMatchScore } from "../../../services/recommendationService";
import { startOfYear, endOfYear } from "date-fns";
import { Types } from "mongoose";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Reports } from "../../../models/Reports";

async function updateProfileApproval(
  profileIdOrUserId: string,
  updateData: Record<string, any>,
  successMessage: string,
  sendEmail?: boolean,
  emailType?: "submission" | "approved" | "rejected" | "rectification"
) {
  const objectId = validateUserId(profileIdOrUserId);

  let user = await User.findById(objectId)
    .select(
      "_id isProfileApproved profileReviewStatus firstName lastName email isActive"
    )
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  const newStatus = updateData.profileReviewStatus;
  const currentStatus = user.profileReviewStatus;
  const statusChanged = newStatus !== currentStatus;

  if (!statusChanged) {
    return {
      success: false,
      message: `Profile is already ${currentStatus}.`
    };
  }

  if (newStatus === "rejected" || newStatus === "rectification") {
    updateData.isActive = false;
  } else {
    updateData.isActive = true;
  }

  await User.findByIdAndUpdate(objectId, updateData, { new: false });

  if (sendEmail && statusChanged && user && user.email) {
    const reviewType: "submission" | "approved" | "rejected" | "rectification" =
      emailType || (newStatus === "approved" ? "approved" : "rejected");

    try {
      const enqueued = await enqueueProfileReviewEmail(
        objectId,
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
          `✉️ Profile review email queued for user ${objectId} (${reviewType}) - Status changed from ${currentStatus} to ${newStatus}`
        );
      } else {
        logger.warn(
          `Failed to queue profile review email for user ${objectId}`
        );
      }
    } catch (queueError: any) {
      logger.error("Error queuing profile review email:", {
        userId: objectId,
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

export async function getPendingProfilesService(
  page: number,
  limit: number,
  status: "pending" | "approved" | "rejected" | "rectification"
) {
  const skip = (page - 1) * limit;

  try {
    const userFilter = {
      role: "user",
      profileReviewStatus: status
    };

    const totalCount = await User.countDocuments(userFilter);

    const usersPage = await User.find(userFilter)
      .sort({ createdAt: -1 })
      .select("_id")
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = usersPage.map((u: any) => u._id);

    if (userIds.length === 0) {
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

    const [users, professions, personalData, profiles] = await Promise.all([
      User.find({ _id: { $in: userIds } })
        .select(
          "firstName lastName gender dateOfBirth phoneNumber email customId profileReviewStatus createdAt"
        )
        .lean(),

      UserProfession.find({ userId: { $in: userIds } })
        .select("Occupation userId")
        .lean(),

      UserPersonal.find({ userId: { $in: userIds } })
        .select("full_address userId")
        .lean(),

      Profile.find({ userId: { $in: userIds } })
        .select("photos.closerPhoto userId")
        .lean()
    ]);

    const userMap = new Map<string, any>();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    const professionMap = new Map<string, any>();
    professions.forEach((p) => professionMap.set(p.userId.toString(), p));

    const personalMap = new Map<string, any>();
    personalData.forEach((p) => personalMap.set(p.userId.toString(), p));

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const profilesWithUserData = userIds.map((userId: any) => {
      const user = userMap.get(userId.toString());
      const profession = professionMap.get(userId.toString());
      const personal = personalMap.get(userId.toString());
      const profile = profileMap.get(userId.toString());

      return {
        userId: user?._id,
        customId: user?.customId || null,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        gender: user?.gender || null,
        status: user?.profileReviewStatus || null,
        age: user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
        phoneNumber: user?.phoneNumber || null,
        email: user?.email || null,
        occupation: profession?.Occupation || null,
        city: personal?.full_address?.city || null,
        state: personal?.full_address?.state || null,
        closerPhoto: profile?.photos?.closerPhoto?.url || null,
        createdAt: user?.createdAt || null
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
    logger.error("Error fetching profiles:", error);
    return {
      success: false,
      message: "Failed to fetch profiles"
    };
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

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

export async function getUserProfileDetailsService(userId: string) {
  if (!userId) throw new Error("userId is required");

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
            pipeline: [
              {
                $project: {
                  settings: 0,
                  privacy: 0,
                  __v: 0,
                  updatedAt: 0
                }
              }
            ],
            as: "profile"
          }
        },

        {
          $lookup: {
            from: "userhealths",
            localField: "_id",
            foreignField: "userId",
            pipeline: [{ $limit: 1 }],
            as: "healthData"
          }
        },

        {
          $lookup: {
            from: "userprofessions",
            localField: "_id",
            foreignField: "userId",
            pipeline: [{ $limit: 1 }],
            as: "professionData"
          }
        },

        {
          $lookup: {
            from: "userpersonals",
            localField: "_id",
            foreignField: "userId",
            pipeline: [{ $limit: 1 }],
            as: "personalData"
          }
        },

        {
          $lookup: {
            from: "userfamilies",
            localField: "_id",
            foreignField: "userId",
            pipeline: [{ $limit: 1 }],
            as: "familyData"
          }
        },

        {
          $lookup: {
            from: "usereducations",
            localField: "_id",
            foreignField: "userId",
            pipeline: [{ $limit: 1 }],
            as: "educationsData"
          }
        },

        {
          $lookup: {
            from: "userexpectations",
            localField: "_id",
            foreignField: "userId",
            pipeline: [{ $limit: 1 }],
            as: "expectationsData"
          }
        },

        {
          $addFields: {
            profile: { $arrayElemAt: ["$profile", 0] },
            healthData: { $arrayElemAt: ["$healthData", 0] },
            professionData: { $arrayElemAt: ["$professionData", 0] },
            personalData: { $arrayElemAt: ["$personalData", 0] },
            familyData: { $arrayElemAt: ["$familyData", 0] },
            educationsData: { $arrayElemAt: ["$educationsData", 0] },
            expectationsData: { $arrayElemAt: ["$expectationsData", 0] }
          }
        },

        {
          $project: {
            password: 0,
            __v: 0,
            updatedAt: 0,
            welcomeSent: 0,
            isOnboardingCompleted: 0,
            completedSteps: 0
          }
        }
      ]),

      ConnectionRequest.find({
        $or: [{ sender: objectId }, { receiver: objectId }]
      })
        .select("sender receiver status createdAt")
        .lean()
        .exec()
    ]);

    const profileDataResult = profileDataArray[0];
    if (!profileDataResult) throw new Error("User profile not found");

    const {
      profile,
      healthData,
      professionData,
      personalData,
      familyData,
      educationsData,
      expectationsData,
      blockedUsers = [],
      ...user
    } = profileDataResult;

    const userIdStr = objectId.toString();

    const requestsSent = connectionRequests.filter(
      (r) => r.sender.toString() === userIdStr
    );
    const requestsReceived = connectionRequests.filter(
      (r) => r.receiver.toString() === userIdStr
    );

    const requestUserIds = new Set<string>();
    requestsSent.forEach((r) => requestUserIds.add(r.receiver.toString()));
    requestsReceived.forEach((r) => requestUserIds.add(r.sender.toString()));

    const blockedUserIds = blockedUsers.map((id: any) => id.toString());

    const allTargetIds = Array.from(
      new Set([...requestUserIds, ...blockedUserIds])
    );

    const allUserDetails =
      allTargetIds.length > 0
        ? await User.aggregate([
            {
              $match: {
                _id: {
                  $in: allTargetIds.map((id) => new Types.ObjectId(id))
                }
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
                      "photos.closerPhoto": 1
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
                pipeline: [{ $project: { Occupation: 1 } }, { $limit: 1 }],
                as: "professionData"
              }
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                dateOfBirth: 1,
                closerPhoto: {
                  $arrayElemAt: ["$profile.photos.closerPhoto", 0]
                },
                Occupation: {
                  $arrayElemAt: ["$professionData.Occupation", 0]
                }
              }
            }
          ])
        : [];

    const userDetailsMap = new Map(
      allUserDetails.map((u) => [u._id.toString(), u])
    );

    const matchScores = await Promise.all(
      allTargetIds.map(async (targetId) => {
        try {
          if (!expectationsData) return { targetId, score: 0 };
          const details = userDetailsMap.get(targetId);
          if (!details) return { targetId, score: 0 };

          const score = await computeMatchScore(objectId, targetId, {
            seeker: user,
            seekerExpect: expectationsData,
            candidate: details
          });

          return { targetId, score: Math.round(score?.score || 0) };
        } catch {
          return { targetId, score: 0 };
        }
      })
    );

    const matchScoreMap = new Map(
      matchScores.map((m) => [m.targetId, m.score])
    );

    const buildDetail = (
      targetId: string,
      status: string,
      createdAt?: Date | null
    ) => {
      const d = userDetailsMap.get(targetId);
      return {
        userId: targetId,
        name: d ? `${d.firstName} ${d.lastName}` : "Unknown",
        age: d?.dateOfBirth ? calculateAge(d.dateOfBirth) : null,
        profession: d?.Occupation || null,
        closerPhoto: d?.closerPhoto?.url ? { url: d.closerPhoto.url } : null,
        matchPercentage: matchScoreMap.get(targetId) || 0,
        status,
        createdAt: createdAt || null
      };
    };

    const requestsSentDetails = requestsSent.map((r) =>
      buildDetail(r.receiver.toString(), r.status, r.createdAt)
    );

    const requestsReceivedDetails = requestsReceived.map((r) =>
      buildDetail(r.sender.toString(), r.status, r.createdAt)
    );

    const blockedUsersDetails = blockedUserIds.map((id) =>
      buildDetail(id, "blocked", null)
    );

    return {
      user,
      profile,
      healthData,
      professionData,
      personalData,
      familyData,
      educationsData,
      expectationsData,
      stats: {
        requestsSent: requestsSentDetails.length,
        requestsReceived: requestsReceivedDetails.length,
        accepted: connectionRequests.filter((r) => r.status === "accepted")
          .length,
        blockedUsers: blockedUsersDetails.length
      },
      requestsSentDetails,
      requestsReceivedDetails,
      blockedUsersDetails
    };
  } catch (error) {
    logger.error("Error fetching user profile details:", error);
    throw error;
  }
}

export async function getAllProfilesService(
  page: number,
  limit: number,
  isActive: any
) {
  const skip = (page - 1) * limit;

  const isActiveFilter =
    isActive === "false" || isActive === false ? false : true;

  try {
    const matchCondition: any = {
      "user.role": "user",
      "user.isActive": isActiveFilter
    };

    if (isActiveFilter === true) {
      matchCondition["user.profileReviewStatus"] = "approved";
    }

    const result = await Profile.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      {
        $match: matchCondition
      },

      {
        $addFields: {
          isOnline: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$user.lastLoginAt", null] },
                  {
                    $lte: [
                      {
                        $dateDiff: {
                          startDate: "$user.lastLoginAt",
                          endDate: "$$NOW",
                          unit: "minute"
                        }
                      },
                      3
                    ]
                  }
                ]
              },
              then: true,
              else: false
            }
          }
        }
      },

      {
        $facet: {
          users: [
            { $sort: { "user.createdAt": -1 } },
            { $skip: skip },
            { $limit: limit },

            {
              $lookup: {
                from: "userprofessions",
                localField: "userId",
                foreignField: "userId",
                as: "profession"
              }
            },

            {
              $project: {
                _id: 0,
                userId: "$user._id",
                customId: "$user.customId",
                firstName: "$user.firstName",
                lastName: "$user.lastName",
                gender: "$user.gender",
                dateOfBirth: "$user.dateOfBirth",
                phoneNumber: "$user.phoneNumber",
                email: "$user.email",
                accountType: "$user.accountType",
                occupation: {
                  $arrayElemAt: ["$profession.Occupation", 0]
                },
                closerPhoto: "$photos.closerPhoto.url",
                createdAt: "$user.createdAt",
                isOnline: 1
              }
            }
          ],

          totalCount: [{ $count: "total" }],

          genderStats: [
            {
              $group: {
                _id: { $toLower: "$user.gender" },
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const facet = result[0];

    const users = facet.users ?? [];
    const total = facet.totalCount[0]?.total ?? 0;

    const genderMap = { male: 0, female: 0 };
    facet.genderStats.forEach((g: any) => {
      if (g._id === "male" || g._id === "female") {
        genderMap[g._id] = g.count;
      }
    });

    const usersWithAge = users.map((u: any) => ({
      ...u,
      age: calculateAge(u.dateOfBirth)
    }));

    return {
      success: true,
      data: {
        maleUsersCount: genderMap.male,
        femaleUsersCount: genderMap.female,
        users: usersWithAge
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    };
  } catch (error) {
    logger.error("Error fetching profiles:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch profiles"
    };
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

      User.aggregate([{ $group: { _id: "$accountType", count: { $sum: 1 } } }]),

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

    const requestsWithUserData = await Promise.all(
      requests.map(async (request) => {
        const senderToReceiverResp: any = await computeMatchScore(
          request.sender.userId,
          request.receiver.userId
        );
        const senderToReceiverMatch =
          typeof senderToReceiverResp === "number"
            ? senderToReceiverResp
            : senderToReceiverResp?.score || 0;

        return {
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
          },
          match: senderToReceiverMatch
        };
      })
    );

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

export async function getSuperProfilesService(
  page: number,
  limit: number,
  viewerId: string
) {
  const skip = (page - 1) * limit;

  try {
    if (!viewerId || typeof viewerId !== "string") {
      return { success: false, message: "Authentication required" };
    }

    const viewerObjectId = new mongoose.Types.ObjectId(viewerId);

    const viewerProfile = await Profile.findOne(
      { userId: viewerObjectId },
      { favoriteProfiles: 1 }
    ).lean();

    const favoriteIds: mongoose.Types.ObjectId[] =
      viewerProfile?.favoriteProfiles?.map(
        (id: any) => new mongoose.Types.ObjectId(id)
      ) || [];

    if (!favoriteIds.length) {
      return {
        success: true,
        data: {
          users: []
        },
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false
        }
      };
    }

    const [stats, profiles, totalCount] = await Promise.all([
      User.aggregate([{ $match: { _id: { $in: favoriteIds }, role: "user" } }]),

      Profile.aggregate([
        { $match: { userId: { $in: favoriteIds } } },

        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: "$user" },

        {
          $match: {
            "user.role": "user",
            "user.blockedUsers": { $ne: viewerObjectId }
          }
        },

        {
          $lookup: {
            from: "users",
            let: { uid: "$userId" },
            pipeline: [
              {
                $match: {
                  _id: viewerObjectId,
                  blockedUsers: { $ne: "$$uid" }
                }
              }
            ],
            as: "viewerBlockCheck"
          }
        },
        { $match: { viewerBlockCheck: { $ne: [] } } },

        { $sort: { "user.createdAt": -1 } },
        { $skip: skip },
        { $limit: limit },

        {
          $lookup: {
            from: "userprofessions",
            localField: "userId",
            foreignField: "userId",
            as: "profession"
          }
        },

        {
          $project: {
            _id: 0,
            userId: "$user._id",
            customId: "$user.customId",
            firstName: "$user.firstName",
            lastName: "$user.lastName",
            gender: "$user.gender",
            dateOfBirth: "$user.dateOfBirth",
            phoneNumber: "$user.phoneNumber",
            email: "$user.email",
            accountType: "$user.accountType",
            occupation: { $arrayElemAt: ["$profession.Occupation", 0] },
            closerPhoto: "$photos.closerPhoto.url",
            createdAt: "$user.createdAt",
            status: "$user.profileReviewStatus"
          }
        }
      ]),

      Profile.countDocuments({ userId: { $in: favoriteIds } })
    ]);

    const usersWithAge = profiles.map((p: any) => ({
      ...p,
      age: calculateAge(p.dateOfBirth)
    }));

    return {
      success: true,
      data: {
        users: usersWithAge
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount
      }
    };
  } catch (error) {
    logger.error("Error fetching favorite profiles:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch favorite profiles"
    };
  }
}

export async function changeUserPasswordService(
  userId: string,
  newPassword: string
) {
  if (!userId) {
    return {
      success: false,
      message: "Authentication required"
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

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

export async function getReportsService() {
  try {
    const reports = await Reports.find().select("-__v").lean();
    return {
      success: true,
      data: reports
    };
  } catch (error) {
    logger.error("Error fetching reports:", error);
    return {
      success: false,
      message: "Failed to fetch reports"
    };
  }
}

export async function updateReportStatusService(id: string, status: string) {
  try {
    const report = await Reports.findById(id);

    if (!report) {
      return {
        success: false,
        message: "Report not found"
      };
    }

    report.status = status;
    await report.save();

    return {
      success: true,
      message: "Report status updated successfully"
    };
  } catch (error) {
    logger.error("Error updating report status:", error);
    return {
      success: false,
      message: "Failed to update report status"
    };
  }
}

export async function getAllPremiumsProfilesService(
  page: number,
  limit: number
) {
  const skip = (page - 1) * limit;

  try {
    const totalCount = await User.countDocuments({ accountType: "premium" });

    const usersPage = await User.find({ accountType: "premium" })
      .sort({ createdAt: -1 })
      .select("_id")
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = usersPage.map((p: any) => p._id);

    if (userIds.length === 0) {
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

    const [users, profiles, payments] = await Promise.all([
      User.find({ _id: { $in: userIds }, role: "user" })
        .select(
          "firstName lastName gender dateOfBirth phoneNumber email customId createdAt isActive"
        )
        .lean(),

      Profile.find({ userId: { $in: userIds } })
        .select("photos.closerPhoto userId")
        .lean()
      ,
      Payment.find({ userId: { $in: userIds } })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const userMap = new Map<string, any>();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const paymentMap = new Map<string, any>();
    (payments || []).forEach((p: any) => {
      const uid = p.userId?.toString?.() || p.userId;
      if (!paymentMap.has(uid)) paymentMap.set(uid, p);
    });

    const profilesWithUserData = userIds.map((userId: any) => {
      const user = userMap.get(userId.toString());
      const profile = profileMap.get(userId.toString());

      return {
        userId: user?._id,
        customId: user?.customId || null,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        gender: user?.gender || null,
        status: user?.profileReviewStatus || null,
        isActive: user?.isActive || false,
        accountType: user?.accountType || "premium",
        age: user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
        phoneNumber: user?.phoneNumber || null,
        email: user?.email || null,
        closerPhoto: profile?.photos?.closerPhoto?.url || null,
        createdAt: user?.createdAt || null,
        plan: user?.planDurationMonths || null,
        amountPaid: paymentMap.get(userId.toString())?.amount || null,
        paymentDate: paymentMap.get(userId.toString())?.createdAt || null,
        expiryDate: user?.planExpiry || null
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
    logger.error("Error fetching premium profiles:", error);
    return {
      success: false,
      message: "Failed to fetch premium profiles"
    };
  }
}
