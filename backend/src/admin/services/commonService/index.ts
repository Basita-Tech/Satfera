import { logger } from "../../../lib";
import { User } from "../../../models/User";
import { ConnectionRequest } from "../../../models/ConnectionRequest";
import { escapeRegExp } from "lodash";

class commonService {
  static async getAdminDashboardStats() {
    try {
      const [userStats, profileStats, connectionStats] = await Promise.all([
        User.aggregate([
          { $match: { role: "user" } },
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
              inactiveUsers: {
                $sum: { $cond: [{ $not: ["$isActive"] }, 1, 0] }
              }
            }
          }
        ]),

        User.aggregate([
          {
            $facet: {
              profileCounts: [
                {
                  $group: {
                    _id: "$profileReviewStatus",
                    count: { $sum: 1 }
                  }
                }
              ],
              pendingGender: [
                { $match: { profileReviewStatus: "pending" } },
                {
                  $group: {
                    _id: "$gender",
                    count: { $sum: 1 }
                  }
                }
              ],
              premiumCount: [
                { $match: { accountType: "premium" } },
                { $count: "count" }
              ]
            }
          }
        ]),

        ConnectionRequest.aggregate([
          {
            $facet: {
              f2mRequests: [
                {
                  $lookup: {
                    from: "users",
                    localField: "sender",
                    foreignField: "_id",
                    as: "sender"
                  }
                },
                { $unwind: "$sender" },
                {
                  $lookup: {
                    from: "users",
                    localField: "receiver",
                    foreignField: "_id",
                    as: "receiver"
                  }
                },
                { $unwind: "$receiver" },
                {
                  $match: {
                    "sender.gender": "female",
                    "receiver.gender": "male"
                  }
                },
                { $count: "count" }
              ],
              m2fRequests: [
                {
                  $lookup: {
                    from: "users",
                    localField: "sender",
                    foreignField: "_id",
                    as: "sender"
                  }
                },
                { $unwind: "$sender" },
                {
                  $lookup: {
                    from: "users",
                    localField: "receiver",
                    foreignField: "_id",
                    as: "receiver"
                  }
                },
                { $unwind: "$receiver" },
                {
                  $match: {
                    "sender.gender": "male",
                    "receiver.gender": "female"
                  }
                },
                { $count: "count" }
              ]
            }
          }
        ])
      ]);

      const userData = userStats[0] ?? {};
      const profileData = profileStats[0] ?? {};
      const connectionData = connectionStats[0] ?? {};

      const profileCounts = Object.fromEntries(
        (profileData.profileCounts ?? []).map((item: any) => [
          item._id,
          item.count
        ])
      );

      return {
        receivedUsers: profileCounts.pending || 0,
        receivedFemale:
          profileData.pendingGender?.find((g: any) => g._id === "female")
            ?.count || 0,
        receivedMale:
          profileData.pendingGender?.find((g: any) => g._id === "male")
            ?.count || 0,

        approvedUsers: profileCounts.approved || 0,
        rejectedUsers: profileCounts.rejected || 0,

        totalUsers: userData.totalUsers || 0,
        activeUsers: userData.activeUsers || 0,
        inactiveUsers: userData.inactiveUsers || 0,

        premiumSubscribers: profileData.premiumCount?.[0]?.count || 0,

        femaleToMaleRequests: connectionData.f2mRequests?.[0]?.count || 0,
        maleToFemaleRequests: connectionData.m2fRequests?.[0]?.count || 0
      };
    } catch (error) {
      logger.error("Error fetching admin dashboard stats:", error);
      throw error;
    }
  }
}

export { commonService };

function normalizeAndEscape(value?: string) {
  if (!value) return undefined;
  return escapeRegExp(value.toLowerCase());
}

export async function adminSearchService(filters: any = {}) {
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const skip = (page - 1) * limit;

  const nameLower = normalizeAndEscape(filters.name);
  const customIdLower = normalizeAndEscape(filters.customId);
  const emailLower = normalizeAndEscape(filters.email);
  const phoneLower = normalizeAndEscape(filters.phoneNumber);
  const genderLower = normalizeAndEscape(filters.gender);
  const accountTypeLower = normalizeAndEscape(filters.accountType);
  const religionLower = normalizeAndEscape(filters.religion);
  const professionLower = normalizeAndEscape(filters.profession);

  const match: any = {
    isDeleted: false,
    role: "user"
  };

  if (customIdLower) {
    match.customId = { $regex: customIdLower, $options: "i" };
  }
  if (emailLower) {
    match.email = { $regex: emailLower, $options: "i" };
  }
  if (phoneLower) {
    match.phoneNumber = { $regex: phoneLower, $options: "i" };
  }
  if (genderLower) {
    match.gender = { $regex: `^${genderLower}$`, $options: "i" };
  }

  const now = new Date();
  if (filters.newProfile && filters.newProfile !== "all") {
    const daysMap: Record<string, number> = {
      last1week: 7,
      last3week: 21,
      last1month: 30
    };
    const days = daysMap[filters.newProfile as string] || 0;
    if (days > 0) {
      const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      match.createdAt = { $gte: since };
    }
  }

  if (filters.profileReviewStatus) {
    match.profileReviewStatus = filters.profileReviewStatus;
  }

  if (filters.ageFrom || filters.ageTo) {
    const ageFrom = parseInt(filters.ageFrom, 10) || 0;
    const ageTo = parseInt(filters.ageTo, 10) || 120;

    const toDate = new Date(
      now.getFullYear() - ageFrom,
      now.getMonth(),
      now.getDate() + 1
    );
    const fromDate = new Date(
      now.getFullYear() - ageTo,
      now.getMonth(),
      now.getDate() + 1
    );
    match.dateOfBirth = { $gte: fromDate, $lte: toDate };
  }

  const pipeline: any[] = [];

  pipeline.push({ $match: match });

  if (nameLower) {
    pipeline.push({
      $addFields: {
        __fullNameLower: {
          $toLower: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$firstName", ""] },
                  " ",
                  { $ifNull: ["$lastName", ""] }
                ]
              }
            }
          }
        }
      }
    });

    pipeline.push({
      $match: {
        $or: [
          { firstName: { $regex: nameLower, $options: "i" } },
          { lastName: { $regex: nameLower, $options: "i" } },
          { __fullNameLower: { $regex: nameLower, $options: "i" } }
        ]
      }
    });
  }

  pipeline.push({
    $lookup: {
      from: "profiles",
      let: { uid: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
        { $project: { photos: { closerPhoto: 1 } } },
        { $limit: 1 }
      ],
      as: "profileDoc"
    }
  });
  pipeline.push({
    $unwind: { path: "$profileDoc", preserveNullAndEmptyArrays: true }
  });

  if (accountTypeLower) {
    pipeline.push({
      $match: {
        accountType: { $regex: `^${accountTypeLower}$`, $options: "i" }
      }
    });
  }

  pipeline.push({
    $lookup: {
      from: "userprofessions",
      let: { uid: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$userId", "$$uid"]
            }
          }
        },
        { $project: { Occupation: 1, OrganizationName: 1 } }
      ],
      as: "professionDocs"
    }
  });

  if (professionLower) {
    pipeline.push({
      $addFields: {
        __matchingProfessions: {
          $filter: {
            input: "$professionDocs",
            as: "pd",
            cond: {
              $or: [
                {
                  $regexMatch: {
                    input: { $toLower: "$$pd.Occupation" },
                    regex: professionLower
                  }
                },
                {
                  $regexMatch: {
                    input: { $toLower: "$$pd.OrganizationName" },
                    regex: professionLower
                  }
                }
              ]
            }
          }
        }
      }
    });
    pipeline.push({
      $match: {
        "__matchingProfessions.0": { $exists: true }
      }
    });
  }

  pipeline.push({
    $lookup: {
      from: "userpersonals",
      let: { uid: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$userId", "$$uid"]
            }
          }
        },
        { $project: { religion: 1 } },
        { $limit: 1 }
      ],
      as: "personalDoc"
    }
  });
  pipeline.push({
    $unwind: { path: "$personalDoc", preserveNullAndEmptyArrays: true }
  });

  if (religionLower) {
    pipeline.push({
      $match: {
        $expr: {
          $regexMatch: {
            input: { $toLower: "$personalDoc.religion" },
            regex: religionLower
          }
        }
      }
    });
  }

  pipeline.push({
    $addFields: {
      age: {
        $cond: [
          { $ifNull: ["$dateOfBirth", false] },
          {
            $dateDiff: {
              startDate: "$dateOfBirth",
              endDate: "$$NOW",
              unit: "year"
            }
          },
          null
        ]
      },
      isOnline: {
        $cond: [
          { $ifNull: ["$lastLoginAt", false] },
          {
            $lte: [{ $subtract: ["$$NOW", "$lastLoginAt"] }, 3 * 60 * 1000]
          },
          false
        ]
      }
    }
  });

  const sortField = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder === 1 ? 1 : -1;
  const sortObj: any = {};
  sortObj[sortField] = sortOrder;

  const finalProjection: any = {
    _id: 0,
    userId: "$_id",
    customId: 1,
    firstName: 1,
    lastName: 1,
    gender: 1,
    dateOfBirth: 1,
    age: 1,
    phoneNumber: 1,
    email: 1,
    accountType: "$accountType",
    occupation: {
      $ifNull: [{ $arrayElemAt: ["$professionDocs.Occupation", 0] }, "N/A"]
    },
    closerPhoto: "$profileDoc.photos.closerPhoto.url",
    createdAt: 1,
    isOnline: 1
  };

  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      results: [
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limit },
        { $project: finalProjection }
      ]
    }
  });

  const aggregateResult = await User.aggregate(pipeline)
    .allowDiskUse(true)
    .exec();

  const meta = aggregateResult[0]?.metadata?.[0];

  return {
    total: meta?.total || 0,
    results: aggregateResult[0]?.results || []
  };
}
