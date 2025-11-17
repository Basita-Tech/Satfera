import { Request, Response } from "express";
import { searchService } from "../../services";
import { User } from "../../models";

export async function searchController(req: Request, res: Response) {
  try {
    const {
      name,
      newProfile,
      ageFrom,
      ageTo,
      heightFrom,
      heightTo,
      religion,
      caste,
      city,
      profession,
      sortBy,
      page = "1",
      limit = "20"
    } = req.query as any;

    const filters: any = {};
    if (name) filters.name = String(name);
    if (newProfile) filters.newProfile = String(newProfile) as any;
    if (ageFrom) filters.ageFrom = parseInt(String(ageFrom), 10);
    if (ageTo) filters.ageTo = parseInt(String(ageTo), 40);
    if (heightFrom) filters.heightFrom = Number(heightFrom);
    if (heightTo) filters.heightTo = Number(heightTo);
    if (religion) filters.religion = String(religion);
    if (caste) filters.caste = String(caste);
    if (city) filters.city = String(city);
    if (profession) filters.profession = String(profession);

    const authUserId = req.user?.id;

    const authUser = await User.findById(authUserId).select("gender").lean();

    if (authUser && (authUser as any).gender) {
      const g = String((authUser as any).gender).toLowerCase();
      if (g === "male") filters.gender = "female";
      else if (g === "female") filters.gender = "male";
    }
    if (sortBy) filters.sortBy = String(sortBy);

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(String(limit), 10) || 20)
    );

    const result = await searchService(filters, pageNum, limitNum);

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (err: any) {
    console.error("searchController error:", err);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
}
