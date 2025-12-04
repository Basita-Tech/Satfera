import { maskEmail, maskPhoneNumber } from "./dataMasking";
import { MatchingStatus, ScoreDetail } from "../../types";
import { calculateAge } from "../../utils/utils";

export async function formatListingProfile(
  candidate: any,
  personal: any,
  profile: any,
  profession: any,
  scoreDetail?: ScoreDetail,
  status: MatchingStatus = null
): Promise<any> {
  const age = calculateAge(candidate?.dateOfBirth);
  const candidateId = candidate?._id?.toString() || "";

  const isFavorite =
    profile?.favoriteProfiles?.some(
      (favId: any) => favId.toString() === candidateId
    ) || false;

  const closerPhotoUrl = profile?.photos?.closerPhoto?.url || null;
  return {
    user: {
      userId: candidateId,
      firstName: candidate?.firstName || null,
      lastName: candidate?.lastName || null,
      status: status,
      age: age || null,
      city: personal?.full_address?.city || null,
      state: personal?.full_address?.state || null,
      country: personal?.residingCountry || null,
      religion: personal?.religion || null,
      subCaste: personal?.subCaste || null,
      profession: profession?.Occupation || null,
      isFavorite: isFavorite,
      closerPhoto: {
        url: closerPhotoUrl
      },
      createdAt: candidate?.createdAt
        ? new Date(candidate.createdAt).toISOString()
        : null
    },
    scoreDetail: scoreDetail || { score: 0, reasons: [] }
  };
}

export async function formatDetailedProfile(
  candidate: any,
  personal: any,
  education: any,
  profession: any,
  family: any,
  isFavorite: boolean,
  health: any,
  scoreDetail?: ScoreDetail,
  status?: MatchingStatus
): Promise<any> {
  const age = calculateAge(candidate?.dateOfBirth);

  const isAccepted = status === "accepted";
  const annualIncome = profession?.AnnualIncome
    ? isAccepted
      ? profession.AnnualIncome
      : "****"
    : "****";
  const phoneNumber = candidate?.phoneNumber
    ? isAccepted
      ? candidate.phoneNumber
      : maskPhoneNumber(candidate.phoneNumber)
    : "****";
  const email = candidate?.email
    ? isAccepted
      ? candidate.email
      : maskEmail(candidate.email)
    : "****";

  const ms = String(personal?.marriedStatus || "").toLowerCase();
  const hasChildren = !!personal?.isHaveChildren;
  const extraPersonalFields: Record<string, any> = {};

  if (ms.indexOf("never") === -1 && ms !== "") {
    extraPersonalFields.hasChildren = hasChildren;
    if (hasChildren) {
      extraPersonalFields.numberOfChildren = personal?.numberOfChildren ?? 0;
      extraPersonalFields.isChildrenLivingWithYou =
        personal?.isChildrenLivingWithYou;
    }
  }

  if (ms.indexOf("separat") !== -1 || personal?.isYouLegallySeparated) {
    extraPersonalFields.isLegallySeparated =
      personal?.isYouLegallySeparated ?? false;
    if (personal?.isYouLegallySeparated) {
      extraPersonalFields.separatedSince = personal?.separatedSince || null;
    }
  }

  if (ms.indexOf("divorc") !== -1) {
    extraPersonalFields.divorceStatus = personal?.divorceStatus || null;
    if (hasChildren) {
      extraPersonalFields.numberOfChildren = personal?.numberOfChildren ?? 0;
      extraPersonalFields.isChildrenLivingWithYou =
        personal?.isChildrenLivingWithYou;
      extraPersonalFields.hasChildren = true;
    }
  }

  return {
    userId: candidate?._id?.toString(),
    firstName: candidate?.firstName,
    lastName: candidate?.lastName,
    middleName: candidate?.middleName,
    gender: candidate?.gender,
    age: age,
    dateOfBirth: candidate?.dateOfBirth,
    isFavorite: isFavorite,
    email: email,
    phoneNumber: phoneNumber,
    customId: candidate?.customId || null,
    scoreDetail: scoreDetail
      ? { score: scoreDetail.score, reasons: scoreDetail.reasons }
      : { score: 0, reasons: [] },

    status: status,
    createdAt: candidate?.createdAt,

    personal: {
      city: personal?.full_address?.city,
      state: personal?.full_address?.state,
      country: personal?.residingCountry,
      nationality: personal?.nationality,
      religion: personal?.religion,
      subCaste: personal?.subCaste,
      height: personal?.height,
      weight: personal?.weight,
      marriedStatus: personal?.marriedStatus,
      marryToOtherReligion: personal?.marryToOtherReligion,
      astrologicalSign: personal?.astrologicalSign,
      birthPlace: personal?.birthPlace,
      birthState: personal?.birthState,
      timeOfBirth: personal?.timeOfBirth,
      dosh: personal?.dosh,
      ...extraPersonalFields
    },

    family: {
      fatherName: family?.fatherName,
      motherName: family?.motherName,
      fatherOccupation: family?.fatherOccupation,
      motherOccupation: family?.motherOccupation,
      fatherNativePlace: family?.fatherNativePlace,
      ...(family?.haveSibling
        ? {
            siblings: family?.howManySiblings,
            siblingDetails: family?.siblingDetails?.map((s: any) => ({
              name: s?.name,
              relation: s?.relation,
              maritalStatus: s?.maritalStatus
            }))
          }
        : {}),
      grandFatherName: family?.grandFatherName,
      grandMotherName: family?.grandMotherName,
      nanaName: family?.nanaName,
      nanaNativePlace: family?.nanaNativePlace,
      naniName: family?.naniName,
      familyType: family?.familyType
    },
    education: {
      SchoolName: education?.SchoolName,
      HighestEducation: education?.HighestEducation,
      FieldOfStudy: education?.FieldOfStudy,
      University: education?.University,
      CountryOfEducation: education?.CountryOfEducation
    },
    professional: {
      OrganizationName: profession?.OrganizationName,
      EmploymentStatus: profession?.EmploymentStatus,
      AnnualIncome: annualIncome,
      Occupation: profession?.Occupation
    },
    healthAndLifestyle: {
      isAlcoholic: health?.isAlcoholic,
      isTobaccoUser: health?.isTobaccoUser,
      isHaveTattoos: health?.isHaveTattoos,
      diet: health?.diet
    }
  };
}
