import { Response } from "express";
import { validationResult } from "express-validator";
import {
  createUserPersonalService,
  getUserPersonalByUserIdService,
  updateUserPersonalService,
  deleteUserPersonalService,
  getUserFamilyDetailsService,
  addUserFamilyDetailsService,
  updateUserFamilyDetailsService,
} from "../services/userPersonal";
import { AuthenticatedRequest } from "../types/types";
import { User } from "../models/User";
import { UserPersonal } from "../models/User_personal";

export const createUserPersonalController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      const pretty = (param: string | undefined) => {
        if (!param) return "body";
        const map: Record<string, string> = {
          dateOfBirth: "date Of Birth",
          timeOfBirth: "time Of Birth",
          full_address: "full address",
          userId: "User ID",
        };
        return map[param] || param;
      };

      return res.status(400).json({
        success: false,
        errors: errors.array().map((e: any) => ({
          field: pretty(e.param) || e.location || "body",
          message:
            e.msg && e.msg !== "Invalid value"
              ? e.msg
              : `Invalid value provided${
                  typeof e.value !== "undefined"
                    ? `: ${JSON.stringify(e.value)}`
                    : ""
                }`,
          value: e.value,
        })),
      });
    }
    const user = req.user;

    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    const body = { ...req.body };
    if (body.userId !== user.id && user.role !== "admin") {
      res
        .status(403)
        .json({ success: false, message: "Cannot create for another user" });
      return;
    }

    const existing = await UserPersonal.findOne({ userId: body.userId });
    if (existing) {
      res.status(409).json({
        success: false,
        message: "User personal details already exist",
      });
      return;
    }

    const result = await createUserPersonalService(body);

    const createdDoc = (result as any).document || result;
    res.status(201).json({ success: true, data: createdDoc });
  } catch (error: any) {
    if (error?.name === "CastError") {
      const field = (error as any).path || "value";
      return res.status(400).json({
        success: false,
        message: `${field} must be a valid ${((error as any).kind || "value")
          .toString()
          .toLowerCase()}`,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserPersonalController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    const userId = req.user?.id;

    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }

    if (authUser && authUser.role !== "admin" && userId !== authUser.id) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    const data = await getUserPersonalByUserIdService(userId);
    if (!data) {
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserPersonalController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e: any) => ({
          field: e.param || e.location || "body",
          message:
            e.msg && e.msg !== "Invalid value"
              ? e.msg
              : `Invalid value provided${
                  typeof e.value !== "undefined"
                    ? `: ${JSON.stringify(e.value)}`
                    : ""
                }`,
          value: e.value,
        })),
      });
    }
    const authUser = req.user;
    const userId = authUser?.id;
    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }
    if (authUser && authUser.role !== "admin" && userId !== authUser.id) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    const body = req.body ?? {};
    const data = await updateUserPersonalService(userId, body);
    res.json({ success: true, data });
  } catch (error: any) {
    if (error?.name === "CastError") {
      const field = (error as any).path || "value";
      return res.status(400).json({
        success: false,
        message: `${field} must be a valid ${((error as any).kind || "value")
          .toString()
          .toLowerCase()}`,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUserPersonalController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    const userId = authUser?.id;

    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }
    if (authUser && authUser.role !== "admin" && userId !== authUser.id) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
    await deleteUserPersonalService(userId);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    if (error?.name === "CastError") {
      const field = (error as any).path || "value";
      return res.status(400).json({
        success: false,
        message: `${field} must be a valid ${((error as any).kind || "value")
          .toString()
          .toLowerCase()}`,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserFamilyDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }
    const data = await getUserFamilyDetailsService(userId);
    if (!data) {
      res.status(404).json({ success: false, message: "Record not found" });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as any).message });
  }
};

export const addUserFamilyDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userIdFromParams = req.params.userId;
    const userId = req.user?.id;

    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }

    if (userIdFromParams !== userId) {
      res.status(403).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const data = await addUserFamilyDetailsService(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as any).message });
  }
};

export const updateUserFamilyDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required" });
      return;
    }
    const data = await updateUserFamilyDetailsService(userId, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as any).message });
  }
};
