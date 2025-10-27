import { Types } from "mongoose";
import { UserPersonal } from "../../models/User_personal";
import { IUserFamily, UserFamily } from "../../models/User_family";
import { CreateUserPersonalInput } from "../../types/types";
import { IUserEducation, UserEducation } from "../../models/User_educations";
import {
  IUserExpectations,
  UserExpectations,
} from "../../models/User_expectations";
import { User } from "../../models/User";

export const createUserPersonalService = async (
  data: CreateUserPersonalInput,
  userId: any
) => {
  const userPersonal = await UserPersonal.create({ ...data, userId });
  return { created: true, document: userPersonal } as const;
};

export const getUserPersonalByUserIdService = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const user = await User.findById(userId)
    .select("firstName middleName lastName dateOfBirth")
    .lean();

  const userPersonal = await UserPersonal.findOne({ userId })
    .lean()
    .select("-userId -createdAt -updatedAt -_id -__v");

  const result = { ...(user || {}), ...(userPersonal || {}) };

  return result;
};

export const updateUserPersonalService = async (
  userId: string,
  data: Partial<CreateUserPersonalInput>
) => {
  const update: any = { ...data };

  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  return UserPersonal.findOneAndUpdate({ userId }, update, {
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  }).select("-userId -createdAt -updatedAt -_id -__v");
};

export const getUserFamilyDetailsService = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  return UserFamily.findOne({ userId: new Types.ObjectId(userId) })
    .select("-_id -__v -userId -createdAt -updatedAt")
    .lean();
};

export const addUserFamilyDetailsService = async (data: IUserFamily) => {
  const userId =
    typeof data.userId === "string"
      ? data.userId
      : (data.userId as any)?.toString();
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  const existing = await UserFamily.findOne({ userId });
  if (existing) {
    throw new Error("Family details already exist for this user");
  }
  const familyDetails = new UserFamily({ ...data, userId });
  familyDetails.save();

  return familyDetails;
};

export const updateUserFamilyDetailsService = async (
  userId: string,
  data: Partial<IUserFamily>
) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  if (data.userId) {
    delete (data as any).userId;
  }
  const updated = await UserFamily.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    data,
    {
      new: true,
      runValidators: true,
    }
  ).select("-_id -__v -userId -createdAt -updatedAt");
  if (!updated) {
    throw new Error("Family details not found for this user");
  }
  return updated;
};

export const getUserEducationDetailsService = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  return UserEducation.findOne({ userId })
    .select("-_id -__v -userId -createdAt -updatedAt")
    .lean();
};

export const addUserEducationDetailsService = async (
  data: Partial<IUserEducation>
) => {
  const userId =
    typeof data.userId === "string"
      ? data.userId
      : (data.userId as any)?.toString();

  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  const existing = await UserEducation.findOne({
    userId: new Types.ObjectId(userId),
  });
  if (existing) {
    throw new Error("Education details already exist for this user");
  }
  const userEducation = new UserEducation({ ...data, userId });
  return userEducation.save();
};

export const updateUserEducationDetailsService = async (
  userId: string,
  data: Partial<IUserEducation>
) => {
  if (!userId) {
    throw new Error("userId is required");
  }

  const updateData: Partial<IUserEducation> = { ...data };
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  if (data.userId) {
    delete (data as any).userId;
  }
  const updated = await UserEducation.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    data,
    { new: false, runValidators: true }
  ).select("-userId -createdAt -updatedAt -_id -__v");
  if (!updated) {
    throw new Error("Education details not found for this user");
  }
  return updated;
};

export const createUserEducationDetailsService = async (
  data: Partial<IUserEducation>
) => {
  const userId =
    typeof data.userId === "string"
      ? data.userId
      : (data.userId as any)?.toString();

  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  const existing = await UserEducation.findOne({ userId });
  if (existing) {
    throw new Error("Education details already exist for this user");
  }
  const userEducation = new UserEducation({ ...data, userId });
  return userEducation.save();
};

export const getUserExpectationDetailsService = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  return UserExpectations.findOne({ userId })
    .select("-_id -__v -userId -createdAt -updatedAt")
    .lean();
};

export const addUserExpectationDetailsService = async (
  data: Partial<IUserExpectations>
) => {
  const userId =
    typeof data.userId === "string"
      ? data.userId
      : (data.userId as any)?.toString();
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  const existing = await UserExpectations.findOne({ userId });
  if (existing) {
    throw new Error("Expectation details already exist for this user");
  }
  const expectationDetails = new UserExpectations({ ...data, userId });
  return expectationDetails.save();
};

export const updateUserExpectationDetailsService = async (
  userId: string,
  data: Partial<IUserExpectations>
) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  if (data.userId) {
    delete (data as any).userId;
  }
  const updated = await UserExpectations.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    data,
    {
      runValidators: true,
    }
  );
  if (!updated) {
    throw new Error("Expectation details not found for this user");
  }
  return updated;
};
