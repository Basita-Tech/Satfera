import { User, UserPersonal, UserProfession, Profile } from "../../models";
import { formatListingProfile } from "../../lib/common/formatting";

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
  } = {},
  page = 1,
  limit = 20
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
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } }
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
      const scoreDetail = { score: 0, reasons: [] };

      const listing = await formatListingProfile(
        candidate,
        personal,
        profile,
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
