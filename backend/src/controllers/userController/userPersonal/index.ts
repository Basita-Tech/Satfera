import { Response } from "express";
import { validationResult } from "express-validator";
import * as userPersonalService from "../../../services";
import { AuthenticatedRequest } from "../../../types";
import {
  UserPersonal,
  Profile,
  UserHealth,
  UserProfession,
  User
} from "../../../models";
import { invalidateUserMatchScores } from "../../../lib/redis/cacheUtils";
import mongoose from "mongoose";
import { logger } from "../../../lib/common/logger";
import { sendProfileReviewSubmissionEmail } from "../../../lib/emails";

const handleCastError = (res: Response, error: any) => {
  if (error?.name === "CastError") {
    const field = (error as any).path || "value";
    return res.status(400).json({
      success: false,
      message: `${field} must be a valid ${((error as any).kind || "value")
        .toString()
        .toLowerCase()}`
    });
  }
  return null;
};

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
          timeOfBirth: "time Of Birth",
          full_address: "full address"
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
          value: e.value
        }))
      });
    }

    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const body = { ...req.body };

    const existing = await UserPersonal.findOne({ userId: user.id }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User personal details already exist"
      });
    }

    const result = await userPersonalService.createUserPersonalService(
      body,
      user.id
    );
    const createdDoc = (result as any).document || result;

    return res.status(201).json({ success: true, data: createdDoc });
  } catch (error: any) {
    const castResp = handleCastError(res, error);
    if (castResp) return castResp;
    return res.status(500).json({ success: false, message: error.message });
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
    const data = await userPersonalService.getUserPersonalByUserIdService(
      authUser.id
    );
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "User personal details not found" });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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
          value: e.value
        }))
      });
    }

    const authUser = req.user;
    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const canUserDetailsExist = await UserPersonal.findOne({
      userId: authUser.id
    }).lean();

    if (!canUserDetailsExist) {
      return res
        .status(404)
        .json({ success: false, message: "User personal details not found" });
    }

    const body = req.body ?? {};
    const data = await userPersonalService.updateUserPersonalService(
      authUser.id,
      body
    );

    const updated = (data as any).document || data;

    try {
      await invalidateUserMatchScores(new mongoose.Types.ObjectId(authUser.id));
      logger.info(
        `Cache invalidated for user ${authUser.id} after personal details update`
      );
    } catch (cacheErr: any) {
      logger.warn(
        `Failed to invalidate cache for user ${authUser.id}:`,
        cacheErr.message
      );
    }

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    const castResp = handleCastError(res, error);
    if (castResp) return castResp;
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserFamilyDetails = async (
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

    const data = await userPersonalService.getUserFamilyDetailsService(
      authUser.id
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addUserFamilyDetails = async (
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

    const data = await userPersonalService.addUserFamilyDetailsService({
      ...req.body,
      userId: authUser.id
    });

    res.status(201).json({
      success: true,
      data
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserFamilyDetails = async (
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

    const data = await userPersonalService.updateUserFamilyDetailsService(
      authUser.id,
      req.body
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Family details not found" });
    }

    try {
      await invalidateUserMatchScores(new mongoose.Types.ObjectId(authUser.id));
      logger.info(
        `Cache invalidated for user ${authUser.id} after family details update`
      );
    } catch (cacheErr: any) {
      logger.warn(
        `Failed to invalidate cache for user ${authUser.id}:`,
        cacheErr.message
      );
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserEducationDetails = async (
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

    if (!authUser?.id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const data = await userPersonalService.getUserEducationDetailsService(
      authUser.id
    );

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createUserEducationDetails = async (
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

    if (!authUser?.id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const data = await userPersonalService.addUserEducationDetailsService({
      ...req.body,
      userId: authUser.id
    });
    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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

    if (!authUser) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const data = await userPersonalService.updateUserEducationDetailsService(
      authUser.id,
      req.body
    );

    try {
      await invalidateUserMatchScores(new mongoose.Types.ObjectId(authUser.id));
      logger.info(
        `Cache invalidated for user ${authUser.id} after education update`
      );
    } catch (cacheErr: any) {
      logger.warn(
        `Failed to invalidate cache for user ${authUser.id}:`,
        cacheErr.message
      );
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
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
          value: e.value
        }))
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
        message: "Health data already exists for this user"
      });
    }
    const health = await UserHealth.create({
      ...req.body,
      userId: user.id
    });

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
          value: e.value
        }))
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
        runValidators: true
      }
    ).lean();

    if (!health) {
      return res
        .status(404)
        .json({ success: false, message: "Health data not found" });
    }

    try {
      await invalidateUserMatchScores(new mongoose.Types.ObjectId(user.id));
      logger.info(`Cache invalidated for user ${user.id} after health update`);
    } catch (cacheErr: any) {
      logger.warn(
        `Failed to invalidate cache for user ${user.id}:`,
        cacheErr.message
      );
    }

    return res.status(200).json({ success: true, data: health });
  } catch (err: any) {
    const castResp = handleCastError(res, err);
    if (castResp) return castResp;
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

    const expectations =
      await userPersonalService.getUserExpectationDetailsService(userId);
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

    const expectations =
      await userPersonalService.addUserExpectationDetailsService({
        ...data,
        userId
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
    const expectations =
      await userPersonalService.updateUserExpectationDetailsService(
        userId,
        data
      );

    try {
      await invalidateUserMatchScores(new mongoose.Types.ObjectId(userId));
      logger.info(
        `Cache invalidated for user ${userId} after expectations update`
      );
    } catch (cacheErr: any) {
      logger.warn(
        `Failed to invalidate cache for user ${userId}:`,
        cacheErr.message
      );
    }

    return res.status(200).json({ success: true, data: expectations });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const getUserProfessionController = async (
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

    const profession = await UserProfession.findOne({ userId: user.id })
      .select("-_id -__v -createdAt -updatedAt -userId")
      .lean();

    if (!profession) {
      return res
        .status(404)
        .json({ success: false, message: "Profession data not found" });
    }

    return res.status(200).json({ success: true, data: profession });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const addUserProfessionController = async (
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

    const existing = await UserProfession.findOne({ userId: user.id }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Profession data already exists for this user"
      });
    }

    const newProfession = new UserProfession({
      ...req.body,
      userId: user.id
    });

    await newProfession.save();

    return res.status(201).json({ success: true, data: newProfession });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateUserProfessionController = async (
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

    const updated = await UserProfession.findOneAndUpdate(
      { userId: user.id },
      req.body,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Profession data not found" });
    }

    try {
      await invalidateUserMatchScores(new mongoose.Types.ObjectId(user.id));
      logger.info(
        `Cache invalidated for user ${user.id} after profession update`
      );
    } catch (cacheErr: any) {
      logger.warn(
        `Failed to invalidate cache for user ${user.id}:`,
        cacheErr.message
      );
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    const castResp = handleCastError(res, err);
    if (castResp) return castResp;
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const getUserOnboardingStatus = async (
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

    const data = await userPersonalService.getUserOnboardingStatusService(
      authUser.id
    );

    const completedSteps = Array.isArray(data?.completedSteps)
      ? data!.completedSteps
      : [];

    const stepsOrder = [
      "personal",
      "family",
      "education",
      "profession",
      "health",
      "expectation"
    ];

    const nextStep = stepsOrder.find((step) => !completedSteps.includes(step));

    if (!data?.isOnboardingCompleted) {
      return res.status(200).json({
        success: false,
        message: "Onboarding is not completed",
        redirectTo: `/onboarding/user`,
        data
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserOnboardingStatus = async (
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

    const body = req.body ?? {};

    const normalizedBody: any = {
      ...body
    };
    if (typeof body.isOnboardingCompleted !== "undefined") {
      normalizedBody.isOnboardingCompleted = body.isOnboardingCompleted;
    }

    const allowedFields = ["isOnboardingCompleted", "completedSteps"];

    if (
      Object.keys(normalizedBody).some((key) => !allowedFields.includes(key))
    ) {
      const invalidFields = Object.keys(normalizedBody).filter(
        (key) => !allowedFields.includes(key)
      );

      return res.status(400).json({
        success: false,
        message: `The following field(s) are not allowed to be updated: ${invalidFields.join(
          ", "
        )}`,
        invalidFields
      });
    }

    const data = await userPersonalService.updateUserBoardingStatusService(
      authUser.id,
      normalizedBody.isOnboardingCompleted,
      normalizedBody.completedSteps
    );

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get profile review status
 * Used by frontend to check if profile is under review, approved, or rejected
 */
export const getProfileReviewStatusController = async (
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

    const profile = await Profile.findOne({ userId: authUser.id }).select(
      "profileReviewStatus reviewedAt reviewNotes"
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    const user = await User.findById(authUser.id).select("firstName email");

    return res.status(200).json({
      success: true,
      data: {
        profileReviewStatus: profile.profileReviewStatus,
        reviewedAt: profile.reviewedAt || null,
        reviewNotes: profile.reviewNotes || null,
        userName: user?.firstName || "User",
        email: user?.email || null
      }
    });
  } catch (error: any) {
    logger.error("Error fetching profile review status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitProfileForReviewController = async (
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

    const user = await User.findById(authUser.id).select(
      "firstName lastName email"
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    let profile = await Profile.findOne({ userId: authUser.id });
    if (!profile) {
      profile = new Profile({ userId: authUser.id });
    }

    const isFirstSubmission =
      !profile.profileReviewStatus ||
      profile.profileReviewStatus === undefined ||
      profile.profileReviewStatus === null;

    if (!isFirstSubmission) {
      return res.status(200).json({
        success: true,
        message: `Profile already ${profile.profileReviewStatus}.`,
        data: {
          profileReviewStatus: profile.profileReviewStatus,
          submittedAt: profile.createdAt || new Date()
        }
      });
    }

    profile.profileReviewStatus = "pending";
    await profile.save();

    try {
      await sendProfileReviewSubmissionEmail(user.email, user.firstName);
      logger.info(
        `Review submission email sent to user ${authUser.id} (${user.email})`
      );
    } catch (emailError) {
      logger.error("Failed to send review submission email:", emailError);
    }

    logger.info(`Profile submitted for review: ${authUser.id}`);

    return res.status(200).json({
      success: true,
      message: "Profile submitted for review successfully",
      data: {
        profileReviewStatus: profile.profileReviewStatus,
        submittedAt: new Date()
      }
    });
  } catch (error: any) {
    logger.error("Error submitting profile for review:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
