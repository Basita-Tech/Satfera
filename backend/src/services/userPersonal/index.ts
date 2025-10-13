import { Types } from "mongoose";
import { UserPersonal } from "../../models/User_personal";
import { IUserFamily, UserFamily } from "../../models/User_family";
import { CreateUserPersonalInput } from "../../types/types";
import { parseDDMMYYYYToDate } from "../../lib/lib";
import { IUserEducation, UserEducation } from "../../models/User_educations";

export const createUserPersonalService = async (
  data: CreateUserPersonalInput
) => {
  const userId = new Types.ObjectId(data.userId);

  const dob = parseDDMMYYYYToDate((data as any).dateOfBirth as string);
  const payload: any = {
    ...data,
    userId: userId,
  };
  if (dob) payload.dateOfBirth = dob;

  const userPersonal = await UserPersonal.create(payload);
  return { created: true, document: userPersonal } as const;
};

export const getUserPersonalByUserIdService = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  return UserPersonal.findOne({ userId }).lean();
};

export const updateUserPersonalService = async (
  userId: string,
  data: Partial<CreateUserPersonalInput>
) => {
  const update: any = { ...data };
  if (data && (data as any).dateOfBirth) {
    const dob = parseDDMMYYYYToDate((data as any).dateOfBirth as string);
    if (dob) update.dateOfBirth = dob;
    else delete update.dateOfBirth;
  }

  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  return UserPersonal.findOneAndUpdate({ userId }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });
};

export const getUserFamilyDetailsService = async (userId: string) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  return UserFamily.findOne({ userId: new Types.ObjectId(userId) });
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
  return familyDetails.save();
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
  );
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
  return UserEducation.findOne({ userId }).lean();
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
  );
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
