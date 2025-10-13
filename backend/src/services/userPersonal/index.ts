import { Types } from "mongoose";
import { UserPersonal } from "../../models/User_personal";
import { IUserFamily, UserFamily } from "../../models/User_family";
import { CreateUserPersonalInput } from "../../types/types";
import { parseDDMMYYYYToDate } from "../../lib/lib";

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
  return UserPersonal.findOne({ userId });
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

  return UserPersonal.findOneAndUpdate({ userId }, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
};

export const deleteUserPersonalService = async (userId: string) => {
  return UserPersonal.findOneAndDelete({ userId });
};

export const getUserFamilyDetailsService = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  if (!userId) {
    throw new Error("userId is required");
  }

  return UserFamily.findOne({ userId: new Types.ObjectId(userId) });
};

export const addUserFamilyDetailsService = async (data: IUserFamily) => {
  const familyDetails = new UserFamily({
    ...data,
  });
  return familyDetails.save();
};

export const updateUserFamilyDetailsService = async (
  userId: string,
  data: Partial<IUserFamily>
) => {
  return UserFamily.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    data,
    {
      new: false,
    }
  );
};
