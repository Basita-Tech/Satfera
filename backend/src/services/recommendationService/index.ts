import mongoose from "mongoose";
import { User } from "../../models/User";
import { UserExpectations } from "../../models/User_expectations";
import { UserPersonal } from "../../models/User_personal";
import { UserEducation } from "../../models/User_educations";
import { UserProfession } from "../../models/User_professions";

type ScoreDetail = { score: number; reasons: string[] };

const DEFAULT_EXPECTATIONS = {
  age: { from: 21, to: 36 },
  community: [] as string[],
  livingInCountry: undefined,
  livingInState: undefined,
  maritalStatus: "No Preference",
  educationLevel: undefined,
  isConsumeAlcoholic: "occasionally",
  profession: [] as string[],
};

function withDefaults(expect?: any) {
  if (!expect) return { ...DEFAULT_EXPECTATIONS };
  return { ...DEFAULT_EXPECTATIONS, ...expect };
}

function ageOverlapScore(
  expect: { from: number; to: number },
  candidateAge: number
) {
  if (candidateAge >= expect.from && candidateAge <= expect.to) return 100;

  const dist = Math.min(
    Math.abs(candidateAge - expect.from),
    Math.abs(candidateAge - expect.to)
  );

  const score = Math.round(100 - dist * 10);
  return score;
}

function communityScore(
  prefCommunities: string[],
  candidateCommunities: string[]
) {
  if (!prefCommunities || prefCommunities.length === 0) return 50;
  if (!candidateCommunities || candidateCommunities.length === 0) return 1;
  const intersection = prefCommunities.filter((c) =>
    candidateCommunities.includes(c)
  );
  const ratio = Math.min(1, intersection.length / prefCommunities.length);
  return Math.max(1, Math.round(ratio * 100));
}

function toArrayOfStrings(val: any): string[] {
  if (!val && val !== 0) return [];
  if (Array.isArray(val))
    return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === "object") {
    try {
      return Object.values(val)
        .flat()
        .map((v) => String(v).trim())
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }
  return [String(val).trim()];
}

function professionScore(
  prefProfessions: string[] | undefined,
  candidateProfessions: string[] | undefined
) {
  if (!prefProfessions || prefProfessions.length === 0) return 50;
  if (!candidateProfessions || candidateProfessions.length === 0) return 1;
  const pref = prefProfessions.map((p) => p.toLowerCase());
  const cand = candidateProfessions.map((p) => p.toLowerCase());
  const intersection = pref.filter((p) => cand.includes(p));
  const ratio = Math.min(1, intersection.length / pref.length);

  return Math.round(ratio * 100);
}

export async function computeMatchScore(
  seekerUserId: mongoose.Types.ObjectId,
  candidateUserId: mongoose.Types.ObjectId
): Promise<ScoreDetail | null> {
  const [seeker, seekerExpectRaw, candidate, candidateExpectRaw] =
    await Promise.all([
      User.findById(seekerUserId).lean(),
      UserExpectations.findOne({ userId: seekerUserId }).lean(),
      User.findById(candidateUserId).lean(),
      UserExpectations.findOne({ userId: candidateUserId }).lean(),
    ]);

  if (!seeker || !candidate) return null;

  const seekerExpect = withDefaults(seekerExpectRaw as any);
  const candidateExpect = withDefaults(candidateExpectRaw as any);

  if (!candidate) return null;

  const candidateAge = candidateExpect?.age?.from
    ? (candidateExpect.age.from + candidateExpect.age.to) / 2
    : (candidate as any)?.age ?? 30;

  const weights = {
    age: 20,
    community: 20,
    location: 15,
    maritalStatus: 15,
    education: 10,
    alcohol: 10,
    profession: 10,
  };

  const reasons: string[] = [];

  const ageScoreRaw = ageOverlapScore(seekerExpect.age, candidateAge);
  console.log("Age Score:", ageScoreRaw);
  if (ageScoreRaw >= 80) reasons.push("Age within preferred range");

  const seekerCommunities = toArrayOfStrings(seekerExpect.community);
  const candidateCommunities = toArrayOfStrings(candidateExpect.community);
  const communityScoreRaw = communityScore(
    seekerCommunities,
    candidateCommunities
  );
  console.log("Community Score:", communityScoreRaw);
  if (communityScoreRaw > 1) reasons.push("Community preference matched");

  const seekerCountries = toArrayOfStrings(seekerExpect.livingInCountry);
  const candidateCountries = toArrayOfStrings(candidateExpect.livingInCountry);
  const seekerStates = toArrayOfStrings(seekerExpect.livingInState);
  const candidateStates = toArrayOfStrings(candidateExpect.livingInState);

  let locationScoreRaw = 1;

  if (seekerCountries.length > 0 && candidateCountries.length > 0) {
    const countryMatch = seekerCountries.some((c) =>
      candidateCountries.map((x) => x.toLowerCase()).includes(c.toLowerCase())
    );
    if (countryMatch) {
      locationScoreRaw = 100;
      reasons.push("Same country");
    }
  }
  if (seekerStates.length > 0 && candidateStates.length > 0) {
    const stateMatch = seekerStates.some((s) =>
      candidateStates.map((x) => x.toLowerCase()).includes(s.toLowerCase())
    );
    if (stateMatch) {
      locationScoreRaw = 100;
      reasons.push("Same state");
    }
  }

  let maritalScoreRaw = 1;
  if (
    seekerExpect.maritalStatus === "No Preference" ||
    !seekerExpect.maritalStatus
  ) {
    maritalScoreRaw = 100;
  } else if (
    typeof candidateExpect?.maritalStatus === "string" &&
    seekerExpect.maritalStatus === candidateExpect?.maritalStatus
  ) {
    maritalScoreRaw = 100;
  } else maritalScoreRaw = 1;

  if (maritalScoreRaw > 1) reasons.push("Marital status match");

  const seekerEducations = toArrayOfStrings(seekerExpect.educationLevel);
  const candidateEducations = toArrayOfStrings(candidateExpect.educationLevel);

  let educationScoreRaw = 1;
  if (!seekerEducations || seekerEducations.length === 0)
    educationScoreRaw = 80;
  else if (
    seekerEducations.some((s) =>
      candidateEducations.map((c) => c.toLowerCase()).includes(s.toLowerCase())
    )
  )
    educationScoreRaw = 100;
  else educationScoreRaw = 50;

  if (educationScoreRaw >= 80) reasons.push("Education matches");

  const pref = seekerExpect.isConsumeAlcoholic;
  let alcoholScoreRaw = 1;
  if (pref === "occasionally") alcoholScoreRaw = 100;
  else if (pref === candidateExpect?.isConsumeAlcoholic) alcoholScoreRaw = 100;
  else alcoholScoreRaw = 1;

  if (alcoholScoreRaw > 1) reasons.push("Alcohol preference matches");

  const seekerProfessions = toArrayOfStrings(seekerExpect.profession);
  const candidateProfessions = toArrayOfStrings(candidateExpect.profession);
  const professionScoreRaw = professionScore(
    seekerProfessions,
    candidateProfessions
  );
  console.log("Profession Score:", professionScoreRaw);
  if (professionScoreRaw > 1) reasons.push("Profession preference matched");

  const weightedSum =
    ageScoreRaw * weights.age +
    communityScoreRaw * weights.community +
    locationScoreRaw * weights.location +
    maritalScoreRaw * weights.maritalStatus +
    educationScoreRaw * weights.education +
    alcoholScoreRaw * weights.alcohol +
    professionScoreRaw * weights.profession;

  const averaged = weightedSum / 100;
  const normalized = Math.max(1, Math.min(100, Math.round(averaged)));
  console.log("Final Match Score:", normalized);
  return { score: normalized, reasons: Array.from(new Set(reasons)) };
}

export async function findMatchingUsers(
  seekerUserId: mongoose.Types.ObjectId
): Promise<{ user: any; scoreDetail: ScoreDetail }[]> {
  const seekerUser = await User.findById(seekerUserId).lean();
  if (!seekerUser) return [];

  const candidates = await User.find({ _id: { $ne: seekerUserId } }).lean();

  const matchingUsers: { user: any; scoreDetail: ScoreDetail }[] = [];

  const candidateIds = candidates.map(
    (c) => new mongoose.Types.ObjectId((c as any)._id)
  );

  const [personals, educations, professions] = await Promise.all([
    UserPersonal.find({ userId: { $in: candidateIds } }).lean(),
    UserEducation.find({ userId: { $in: candidateIds } }).lean(),
    UserProfession.find({ userId: { $in: candidateIds } }).lean(),
  ]);

  const personalMap = new Map(
    personals.map((p: any) => [p.userId.toString(), p])
  );
  const educationMap = new Map(
    educations.map((e: any) => [e.userId.toString(), e])
  );
  const professionMap = new Map(
    professions.map((pr: any) => [pr.userId.toString(), pr])
  );

  for (const candidate of candidates) {
    const candidateIdStr = String((candidate as any)._id);
    const candidateId = new mongoose.Types.ObjectId(candidateIdStr);
    const scoreDetail = await computeMatchScore(seekerUserId, candidateId);
    if (!scoreDetail) continue;
    if (scoreDetail.score > 70) {
      const personal = personalMap.get(candidateIdStr) as any | undefined;
      const education = educationMap.get(candidateIdStr) as any | undefined;
      const profession = professionMap.get(candidateIdStr) as any | undefined;

      const enrichedUser = {
        fullName: `${candidate.firstName || ""} ${
          candidate.lastName || ""
        }`.trim(),
        isActive: candidate.isActive,
        height: personal?.height ?? null,
        education: education?.HighestEducation ?? null,
        educationField: education?.FieldOfStudy ?? null,
        country:
          personal?.residingCountry ?? education?.CountryOfEducation ?? null,
        state: personal?.full_address?.state ?? null,
        marriedStatus: personal?.marriedStatus ?? null,
        religion: personal?.religion ?? null,
        jobTitle: profession?.Occupation ?? null,
        organization: profession?.OrganizationName ?? null,
        employmentStatus: profession?.EmploymentStatus ?? null,
      };

      matchingUsers.push({ user: enrichedUser, scoreDetail });
    }
  }

  console.log("Matching Users Found:", matchingUsers, matchingUsers.length);
  return matchingUsers;
}
