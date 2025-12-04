import { Types } from "mongoose";
import {
  IUserFamily,
  UserFamily,
  IUserEducation,
  UserEducation,
  UserPersonal,
  User,
  IUserExpectations,
  UserExpectations
} from "../../models";
import { CreateUserPersonalInput } from "../../types";

const validateUserId = (userId: string) => {
  if (!userId) throw new Error("userId is required");
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
  return new Types.ObjectId(userId);
};

export const createUserPersonalService = async (
  data: CreateUserPersonalInput,
  userId: string
) => {
  const userObjectId = validateUserId(userId);
  const userPersonal = await UserPersonal.create({
    ...data,
    userId: userObjectId
  });
  return { success: true, document: userPersonal };
};

export const getUserPersonalByUserIdService = async (userId: string) => {
  const userObjectId = validateUserId(userId);

  const [user, userPersonal] = await Promise.all([
    User.findById(userObjectId)
      .select("firstName middleName lastName dateOfBirth")
      .lean(),
    UserPersonal.findOne({ userId: userObjectId })
      .select("-userId -createdAt -updatedAt -_id -__v")
      .lean()
  ]);

  return { ...(user || {}), ...(userPersonal || {}) };
};

export const updateUserPersonalService = async (
  userId: string,
  data: Partial<CreateUserPersonalInput>
) => {
  const userObjectId = validateUserId(userId);
  const updated = await UserPersonal.findOneAndUpdate(
    { userId: userObjectId },
    data,
    {
      new: true,
      runValidators: true,
      upsert: false
    }
  ).select("-userId -createdAt -updatedAt -_id -__v");

  if (!updated) throw new Error("Personal details not found for this user");
  return updated;
};

export const getUserFamilyDetailsService = async (userId: string) => {
  const userObjectId = validateUserId(userId);
  const re = await UserFamily.findOne({ userId: userObjectId })
    .select("-_id -__v -userId -createdAt -updatedAt")
    .lean();
  return re;
};

export const addUserFamilyDetailsService = async (data: IUserFamily) => {
  const userId = validateUserId(String(data.userId));
  const existing = await UserFamily.findOne({ userId });
  if (existing) throw new Error("Family details already exist for this user");

  const familyDetails = new UserFamily({ ...data, userId });
  await familyDetails.save();
  return familyDetails;
};

export const updateUserFamilyDetailsService = async (
  userId: string,
  data: Partial<IUserFamily>
) => {
  const userObjectId = validateUserId(userId);
  delete (data as any).userId;

  const updated = await UserFamily.findOneAndUpdate(
    { userId: userObjectId },
    data,
    {
      new: true,
      runValidators: true
    }
  ).select("-_id -__v -userId -createdAt -updatedAt");

  if (!updated) throw new Error("Family details not found for this user");
  return updated;
};

export const getUserEducationDetailsService = async (userId: string) => {
  const userObjectId = validateUserId(userId);
  return UserEducation.findOne({ userId: userObjectId })
    .select("-_id -__v -userId -createdAt -updatedAt")
    .lean();
};

export const addUserEducationDetailsService = async (
  data: Partial<IUserEducation>
) => {
  const userId = validateUserId(String(data.userId));
  const existing = await UserEducation.findOne({ userId });
  if (existing)
    throw new Error("Education details already exist for this user");

  const education = new UserEducation({ ...data, userId });
  await education.save();
  return education;
};

export const updateUserEducationDetailsService = async (
  userId: string,
  data: Partial<IUserEducation>
) => {
  const userObjectId = validateUserId(userId);
  delete (data as any).userId;

  const updated = await UserEducation.findOneAndUpdate(
    { userId: userObjectId },
    data,
    {
      new: true,
      runValidators: true
    }
  ).select("-userId -createdAt -updatedAt -_id -__v");

  if (!updated) throw new Error("Education details not found for this user");
  return updated;
};

export const getUserExpectationDetailsService = async (userId: string) => {
  const userObjectId = validateUserId(userId);
  return UserExpectations.findOne({ userId: userObjectId })
    .select("-_id -__v -userId -createdAt -updatedAt")
    .lean();
};

export const addUserExpectationDetailsService = async (
  data: Partial<IUserExpectations>
) => {
  const userId = validateUserId(String(data.userId));
  const existing = await UserExpectations.findOne({ userId });
  if (existing)
    throw new Error("Expectation details already exist for this user");

  const expectation = new UserExpectations({ ...data, userId });
  await expectation.save();
  return expectation;
};

export const updateUserExpectationDetailsService = async (
  userId: string,
  data: Partial<IUserExpectations>
) => {
  const userObjectId = validateUserId(userId);
  delete (data as any).userId;

  const updated = await UserExpectations.findOneAndUpdate(
    { userId: userObjectId },
    data,
    {
      new: true,
      runValidators: true
    }
  ).select("-_id -__v -userId -createdAt -updatedAt");

  if (!updated) throw new Error("Expectation details not found for this user");
  return updated;
};

export const getUserOnboardingStatusService = async (userId: string) => {
  const userObjectId = validateUserId(userId);
  return User.findById(userObjectId)
    .select("isOnboardingCompleted completedSteps")
    .lean();
};

export const updateUserBoardingStatusService = async (
  userId: string,
  isOnboardingCompleted: boolean,
  completedSteps: string[]
) => {
  const userObjectId = validateUserId(userId);

  const updated = await User.findByIdAndUpdate(
    userObjectId,
    { isOnboardingCompleted, completedSteps },
    { new: true, runValidators: true }
  ).select("isOnboardingCompleted completedSteps");

  if (!updated) throw new Error("User not found");
  return updated;
};

export * from "./userSettingService";
