import { maskEmail, maskPhoneNumber } from "./dataMasking";
import { MatchingStatus, ScoreDetail } from "../../types";
import { calculateAge } from "../../utils/utils";

export async function formatListingProfile(
  candidate: any,
  personal: any,
  profile: any,
  scoreDetail?: ScoreDetail,
  status: MatchingStatus = "none"
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
      isFavorite: isFavorite,
      closerPhoto: {
        url: closerPhotoUrl
      }
    },
    scoreDetail: scoreDetail || { score: 0, reasons: [] }
  };
}

export async function formatDetailedProfile(
  candidate: any,
  personal: any,
  education: any,
  profession: any,
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

  return {
    userId: candidate?._id?.toString(),
    firstName: candidate?.firstName,
    lastName: candidate?.lastName,
    middleName: candidate?.middleName,
    gender: candidate?.gender,
    age: age,

    email: candidate?.email ? maskEmail(candidate.email) : null,
    phoneNumber: candidate?.phoneNumber
      ? maskPhoneNumber(candidate.phoneNumber)
      : null,
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
      dosh: personal?.dosh
    },

    family: {
      fatherName: personal?.fatherName,
      motherName: personal?.motherName,
      fatherOccupation: personal?.fatherOccupation,
      motherOccupation: personal?.motherOccupation,
      fatherNativePlace: personal?.fatherNativePlace,
      motherNativePlace: personal?.motherNativePlace,
      siblings: personal?.howManySiblings,
      siblingDetails: personal?.siblingDetails?.map((s: any) => ({
        name: s?.name,
        relation: s?.relation,
        maritalStatus: s?.maritalStatus
      })),
      nanaName: personal?.nanaName,
      nanaNativePlace: personal?.nanaNativePlace,
      naniName: personal?.naniName,
      naniNativePlace: personal?.naniNativePlace,
      numberOfChildren: personal?.numberOfChildren,
      hasChildren: personal?.isHaveChildren,
      isChildrenLivingWithYou: personal?.isChildrenLivingWithYou,
      isLegallySeparated: personal?.isYouLegallySeparated,
      separatedSince: personal?.separatedSince
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
