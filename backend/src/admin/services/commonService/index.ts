import { logger } from "../../../lib";
import { User } from "../../../models/User";
import { Profile } from "../../../models/Profile";
import { ConnectionRequest } from "../../../models/ConnectionRequest";

class commonService {
  static async getAdminDashboardStats() {
    try {
      const premiumPrice = 1000;

      const [userStats, profileStats, connectionStats] = await Promise.all([
        User.aggregate([
          {
            $match: { role: "user", isDeleted: false }
          },
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
              inactiveUsers: {
                $sum: { $cond: [{ $not: ["$isActive"] }, 1, 0] }
              },
              inactiveFemale: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $not: ["$isActive"] },
                        { $eq: ["$gender", "female"] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              inactiveMale: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $not: ["$isActive"] },
                        { $eq: ["$gender", "male"] }
                      ]
                    },
                    1,
                    0
                  ]
                }
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
              approvedGender: [
                { $match: { profileReviewStatus: "approved" } },
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

      const userStatsData = userStats[0] || {};
      const profileData = profileStats[0];
      const connectionData = connectionStats[0];

      const profileCounts = Object.fromEntries(
        profileData.profileCounts.map((r: any) => [r._id, r.count])
      );

      const premiumSubscribers = profileData.premiumCount[0]?.count || 0;
      const monthlyRevenue = premiumSubscribers * premiumPrice;

      return {
        totalUsers: userStatsData.totalUsers || 0,
        activeUsers: userStatsData.activeUsers || 0,
        inactiveUsers: userStatsData.inactiveUsers || 0,
        inactiveFemale: userStatsData.inactiveFemale || 0,
        inactiveMale: userStatsData.inactiveMale || 0,

        rejectedUsers: profileCounts["rejected"] || 0,
        approvedUsers: profileCounts["approved"] || 0,

        receivedUsers: profileCounts["pending"] || 0,
        receivedFemale:
          profileData.pendingGender.find((g: any) => g._id === "female")
            ?.count || 0,
        receivedMale:
          profileData.pendingGender.find((g: any) => g._id === "male")?.count ||
          0,

        approvedFemale:
          profileData.approvedGender.find((g: any) => g._id === "female")
            ?.count || 0,
        approvedMale:
          profileData.approvedGender.find((g: any) => g._id === "male")
            ?.count || 0,

        premiumSubscribers,
        monthlyRevenue,

        femaleToMaleRequests: connectionData.f2mRequests[0]?.count || 0,
        maleToFemaleRequests: connectionData.m2fRequests[0]?.count || 0
      };
    } catch (error) {
      logger.error("Error fetching admin dashboard stats:", error);
      throw error;
    }
  }
}

export { commonService };
