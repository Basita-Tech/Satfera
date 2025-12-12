import { logger } from "../../../lib";
import { User } from "../../../models/User";

class commonService {
  static async getAdminDashboardStats() {
    try {
      const premiumPrice = 1000;

      const result = await Promise.all([
        User.aggregate([
          {
            $facet: {
              users: [
                { $match: { role: "user", isDeleted: false } },
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
              ],

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
                  $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                  }
                },
                { $unwind: "$user" },
                {
                  $group: {
                    _id: "$user.gender",
                    count: { $sum: 1 }
                  }
                }
              ],

              approvedGender: [
                { $match: { profileReviewStatus: "approved" } },
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
                  $group: {
                    _id: "$user.gender",
                    count: { $sum: 1 }
                  }
                }
              ],

              premiumProfiles: [
                { $match: { accountType: "premium" } },
                { $count: "premiumSubscribers" }
              ],

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

      const data = result[0][0];

      const counts = Object.fromEntries(
        data.profileCounts.map((r) => [r._id, r.count])
      );

      const premiumSubscribers =
        data.premiumProfiles[0]?.premiumSubscribers || 0;
      const monthlyRevenue = premiumSubscribers * premiumPrice;

      return {
        ...data.users[0],

        receivedUsers: counts["pending"] || 0,
        rejectedUsers: counts["rejected"] || 0,
        approvedUsers: counts["approved"] || 0,

        receivedFemale:
          data.pendingGender.find((g) => g._id === "female")?.count || 0,
        receivedMale:
          data.pendingGender.find((g) => g._id === "male")?.count || 0,

        approvedFemale:
          data.approvedGender.find((g) => g._id === "female")?.count || 0,
        approvedMale:
          data.approvedGender.find((g) => g._id === "male")?.count || 0,

        premiumSubscribers,
        monthlyRevenue,

        femaleToMaleRequests: data.f2mRequests[0]?.count || 0,
        maleToFemaleRequests: data.m2fRequests[0]?.count || 0
      };
    } catch (error) {
      logger.error("Error fetching admin dashboard stats:", error);
      throw error;
    }
  }
}

export { commonService };
