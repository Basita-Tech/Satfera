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
    const userIdFromParams = req.params.userId;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await getUserPersonalByUserIdService(userIdFromParams);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
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
    const userIdFromParams = req.params.userId;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const body = req.body ?? {};
    const data = await updateUserPersonalService(userIdFromParams, body);

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
    const userIdFromParams = req.params.userId;
    const authUser = req.user;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await getUserFamilyDetailsService(userIdFromParams);
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
    const userIdFromParams = req.params.userId;
    const authUser = req.user;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const user = await User.findById(userIdFromParams);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const data = await addUserFamilyDetailsService({
      ...req.body,
      userId: userIdFromParams,
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
    const userIdFromParams = req.params.userId;
    const authUser = req.user;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await updateUserFamilyDetailsService(
      userIdFromParams,
      req.body
    );

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
    const userIdFromParams = req.params.userId;
    const authUser = req.user;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await getUserEducationDetailsService(userIdFromParams);
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
    const userIdFromParams = req.params.userId;
    const authUser = req.user;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const user = await User.findById(userIdFromParams);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const data = await createUserEducationDetailsService({
      ...req.body,
      userId: userIdFromParams,
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
    const userIdFromParams = req.params.userId;
    const authUser = req.user;
    if (!userIdFromParams) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required in params" });
    }

    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (authUser.role !== "admin" && userIdFromParams !== authUser.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const data = await updateUserEducationDetailsService(
      userIdFromParams,
      req.body
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
