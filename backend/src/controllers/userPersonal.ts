import { Response } from "express";
import { validationResult } from "express-validator";
import {
  createUserPersonalService,
  getUserPersonalByUserIdService,
  updateUserPersonalService,
  getUserFamilyDetailsService,
  addUserFamilyDetailsService,
  updateUserFamilyDetailsService,
  getUserEducationDetailsService,
  updateUserEducationDetailsService,
  createUserEducationDetailsService,
  getUserExectationDetailsService,
  addUserExpectationDetailsService,
} from "../services/userPersonal";
import { AuthenticatedRequest } from "../types/types";
import { UserPersonal } from "../models/User_personal";
import { UserHealth } from "../models/User_health";

export const createUserPersonalController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const errors = validationResult(req);
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

    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "user") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await getUserPersonalByUserIdService(authUser.id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "User personal details not found" });
    }

    const {
      userId,
      dateOfBirth,
      timeOfBirth,
      height,
      weight,
      astrologicalSign,
      BirthPlace,
      religion,
      marriedStatus,
      marryToOtherReligion,
      full_address,
      nationality,
      isResidentOfIndia,
      isHaveChildren,
      numberOfChildren,
      occupation,
      isChildrenLivingWithYou,
      isYouLegallySeparated,
      separatedSince,
    } = data.toObject();
    res.json({
      success: true,
      data: {
        userId,
        dateOfBirth,
        timeOfBirth,
        height,
        weight,
        astrologicalSign,
        BirthPlace,
        religion,
        marriedStatus,
        marryToOtherReligion,
        full_address,
        nationality,
        isResidentOfIndia,
        isHaveChildren,
        numberOfChildren,
        occupation,
        isChildrenLivingWithYou,
        isYouLegallySeparated,
        separatedSince,
      },
    });
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

    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const canUserDetailsExist = await UserPersonal.findOne({
      userId: authUser.id,
    });

    if (!canUserDetailsExist) {
      return res
        .status(404)
        .json({ success: false, message: "User personal details not found" });
    }

    const body = req.body ?? {};
    const data = await updateUserPersonalService(authUser.id, body);

    const {
      userId,
      dateOfBirth,
      timeOfBirth,
      height,
      weight,
      astrologicalSign,
      BirthPlace,
      religion,
      marriedStatus,
      marryToOtherReligion,
      full_address,
      nationality,
      isResidentOfIndia,
      isHaveChildren,
      numberOfChildren,
      occupation,
      isChildrenLivingWithYou,
      isYouLegallySeparated,
      separatedSince,
    } = data.toObject();
    res.json({
      success: true,
      data: {
        userId,
        dateOfBirth,
        timeOfBirth,
        height,
        weight,
        astrologicalSign,
        BirthPlace,
        religion,
        marriedStatus,
        marryToOtherReligion,
        full_address,
        nationality,
        isResidentOfIndia,
        isHaveChildren,
        numberOfChildren,
        occupation,
        isChildrenLivingWithYou,
        isYouLegallySeparated,
        separatedSince,
      },
    });
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
    const authUser = req.user;
    if (!authUser?.id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const data = await getUserFamilyDetailsService(authUser.id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const {
      userId,
      fatherName,
      motherName,
      fatherOccupation,
      motherOccupation,
      fatherNativePlace,
      doYouHaveChildren,
      grandFatherName,
      grandMotherName,
      naniName,
      nanaName,
      nanaNativePlace,
      familyType,
      haveSibling,
      howManySiblings,
      siblingDetails,
    } = data.toObject();
    res.json({
      success: true,
      data: {
        userId,
        fatherName,
        motherName,
        fatherOccupation,
        motherOccupation,
        fatherNativePlace,
        doYouHaveChildren,
        grandFatherName,
        grandMotherName,
        naniName,
        nanaName,
        nanaNativePlace,
        familyType,
        haveSibling,
        howManySiblings,
        siblingDetails,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addUserFamilyDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const data = await addUserFamilyDetailsService({
      ...req.body,
      userId: authUser.id,
    });

    const {
      userId,
      fatherName,
      motherName,
      fatherOccupation,
      motherOccupation,
      fatherNativePlace,
      doYouHaveChildren,
      grandFatherName,
      grandMotherName,
      naniName,
      nanaName,
      nanaNativePlace,
      familyType,
      haveSibling,
      howManySiblings,
      siblingDetails,
    } = data.toObject();
    res.status(201).json({
      success: true,
      data: {
        userId,
        fatherName,
        motherName,
        fatherOccupation,
        motherOccupation,
        fatherNativePlace,
        doYouHaveChildren,
        grandFatherName,
        grandMotherName,
        naniName,
        nanaName,
        nanaNativePlace,
        familyType,
        haveSibling,
        howManySiblings,
        siblingDetails,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserFamilyDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;

    if (!authUser?.id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const data = await updateUserFamilyDetailsService(authUser.id, req.body);

    const {
      userId,
      fatherName,
      motherName,
      fatherOccupation,
      motherOccupation,
      fatherNativePlace,
      doYouHaveChildren,
      grandFatherName,
      grandMotherName,
      naniName,
      nanaName,
      nanaNativePlace,
      familyType,
      haveSibling,
      howManySiblings,
      siblingDetails,
    } = data.toObject();
    res.json({
      success: true,
      data: {
        userId,
        fatherName,
        motherName,
        fatherOccupation,
        motherOccupation,
        fatherNativePlace,
        doYouHaveChildren,
        grandFatherName,
        grandMotherName,
        naniName,
        nanaName,
        nanaNativePlace,
        familyType,
        haveSibling,
        howManySiblings,
        siblingDetails,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserEducationDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const data = await getUserEducationDetailsService(authUser.id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    const { educationDetails } = data.toObject();
    res.json({
      success: true,
      data: {
        educationDetails,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUserEducationDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const data = await createUserEducationDetailsService({
      ...req.body,
      userId: authUser.id,
    });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserEducationDetails = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const data = await updateUserEducationDetailsService(authUser.id, req.body);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserHealthController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const health = await UserHealth.findOne({ userId: user.id })
      .select("-__v")
      .lean();

    if (!health) {
      return res
        .status(404)
        .json({ success: false, message: "Health data not found" });
    }
    return res.status(200).json({ success: true, data: health });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const addUserHealthController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e: any) => ({
          field: e.param,
          message: e.msg,
          value: e.value,
        })),
      });
    }
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const exists = await UserHealth.findOne({ userId: user.id }).lean();

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Health data already exists for this user",
      });
    }
    const health = await UserHealth.create({ ...req.body, userId: user.id });
    return res.status(201).json({ success: true, data: health });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateUserHealthController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e: any) => ({
          field: e.param,
          message: e.msg,
          value: e.value,
        })),
      });
    }
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const health = await UserHealth.findOneAndUpdate(
      { userId: user.id },
      req.body,
      {
        new: true,
        runValidators: true,
        projection: { __v: 0 },
      }
    ).lean();
    if (!health) {
      return res
        .status(404)
        .json({ success: false, message: "Health data not found" });
    }
    return res.status(200).json({ success: true, data: health });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const getUserExpectationsById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const expectations = await getUserExectationDetailsService(userId);
    if (!expectations) {
      return res
        .status(404)
        .json({ success: false, message: "Expectations not found" });
    }

    return res.status(200).json({ success: true, data: expectations });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const createUserExpectations = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const expectations = await addUserExpectationDetailsService({
      ...data,
      userId,
    });
    return res.status(201).json({ success: true, data: expectations });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const updateUserExpectations = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const data = req.body;
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    const expectations = await addUserExpectationDetailsService({
      ...data,
      userId,
    });
    return res.status(200).json({ success: true, data: expectations });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};
