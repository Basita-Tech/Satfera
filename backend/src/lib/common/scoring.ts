import { toArrayOfStrings, isNoPreference } from "../../utils/utils";
import { DIET_CATEGORIES } from "../../utils/constants";

export function ageOverlapScore(
  expect: { from: number; to: number },
  candidateAge?: number
): number {
  if (!candidateAge) return 0;

  if (candidateAge >= expect.from && candidateAge <= expect.to) return 100;

  const dist = Math.min(
    Math.abs(candidateAge - expect.from),
    Math.abs(candidateAge - expect.to)
  );

  const score = Math.round(100 - dist * 10);
  return Math.max(1, score);
}

export function communityScore(
  prefCommunities: string[] | string | object | undefined,
  candidateCommunities: string[] | string | object | undefined
): number {
  const prefArray = toArrayOfStrings(prefCommunities);
  const candArray = toArrayOfStrings(candidateCommunities);
  if (isNoPreference(prefArray))
    return candArray && candArray.length > 0 ? 100 : 0;
  if (!candArray || candArray.length === 0) return 1;

  const include = prefArray.filter((p) => !p.toLowerCase().startsWith("not "));
  const exclude = prefArray
    .filter((p) => p.toLowerCase().startsWith("not "))
    .map((p) => p.slice(4).toLowerCase());

  const candLower = candArray.map((c) => c.toLowerCase());

  const inInclude =
    include.length === 0 ||
    include.some((inc) => candLower.includes(inc.toLowerCase()));
  const inExclude = exclude.some((exc) => candLower.includes(exc));

  if (inInclude && !inExclude) return 100;
  return 1;
}

export function professionScore(
  prefProfessions: string[] | string | object | undefined,
  candidateProfessions: string[] | string | object | undefined
): number {
  const prefArray = toArrayOfStrings(prefProfessions);
  const candArray = toArrayOfStrings(candidateProfessions);
  if (isNoPreference(prefArray))
    return candArray && candArray.length > 0 ? 100 : 0;
  if (!candArray || candArray.length === 0) return 1;

  const include = prefArray.filter((p) => !p.toLowerCase().startsWith("not "));
  const exclude = prefArray
    .filter((p) => p.toLowerCase().startsWith("not "))
    .map((p) => p.slice(4).toLowerCase());

  const candLower = candArray.map((c) => c.toLowerCase());

  const inInclude =
    include.length === 0 ||
    include.some((inc) => candLower.includes(inc.toLowerCase()));
  const inExclude = exclude.some((exc) => candLower.includes(exc));

  if (inInclude && !inExclude) return 100;
  return 1;
}

export function dietScore(
  prefDiets: string[] | string | any,
  candidateDiet: string | string[] | undefined
): number {
  const prefDietsArray = toArrayOfStrings(prefDiets);
  const candidateDietArray = toArrayOfStrings(candidateDiet);
  if (isNoPreference(prefDietsArray))
    return candidateDietArray && candidateDietArray.length > 0 ? 100 : 0;
  if (!candidateDietArray || candidateDietArray.length === 0) return 1;

  const include = prefDietsArray.filter(
    (p) => !p.toLowerCase().startsWith("not ")
  );
  const exclude = prefDietsArray
    .filter((p) => p.toLowerCase().startsWith("not "))
    .map((p) => p.slice(4).toLowerCase());

  const candLower = candidateDietArray.map((d) => d.toLowerCase());

  const inExclude = exclude.some((exc) => candLower.includes(exc));
  if (inExclude) return 1;

  // If include has specific diets, check direct matches
  const directMatches = include.filter((p) =>
    candLower.includes(p.toLowerCase())
  );
  if (directMatches.length > 0) return 100;

  // Category matching
  const prefIsVeg = include.some((d) =>
    DIET_CATEGORIES.vegetarianOptions.includes(d as any)
  );
  const prefIsNonVeg = include.some((d) =>
    DIET_CATEGORIES.nonVegOptions.includes(d as any)
  );
  const prefIsFlexible = include.some((d) =>
    DIET_CATEGORIES.flexibleOptions.includes(d as any)
  );

  const candIsVeg = candidateDietArray.some((d) =>
    DIET_CATEGORIES.vegetarianOptions.includes(d as any)
  );
  const candIsNonVeg = candidateDietArray.some((d) =>
    DIET_CATEGORIES.nonVegOptions.includes(d as any)
  );
  const candIsFlexible = candidateDietArray.some((d) =>
    DIET_CATEGORIES.flexibleOptions.includes(d as any)
  );

  if (prefIsFlexible || candIsFlexible) return 100;

  if ((prefIsVeg && candIsVeg) || (prefIsNonVeg && candIsNonVeg)) return 100;

  return 1;
}

export function educationScore(
  prefEducations: string[] | string | object | undefined,
  candidateEducationLevel: string | undefined
): number {
  const prefArray = toArrayOfStrings(prefEducations);
  if (isNoPreference(prefArray)) return candidateEducationLevel ? 100 : 0;

  if (!candidateEducationLevel) return 50;

  const candEduLower = candidateEducationLevel.toLowerCase();
  const candTokens = candEduLower.split(/[\s\-_]+/).filter(Boolean);

  const include = prefArray.filter((p) => !p.toLowerCase().startsWith("not "));
  const exclude = prefArray
    .filter((p) => p.toLowerCase().startsWith("not "))
    .map((p) => p.slice(4).toLowerCase());

  const inExclude = exclude.some(
    (exc) => candTokens.includes(exc) || candEduLower.includes(exc)
  );
  if (inExclude) return 1;

  const hasMatch = include.some((s) => {
    const sPref = s.toLowerCase();
    return sPref === candEduLower || candTokens.includes(sPref);
  });

  return hasMatch ? 100 : 70;
}

/**
 * Alcohol preference matching
 */
export function alcoholScore(
  seekerPref: string | undefined,
  candidateStatus: boolean | undefined
): number {
  if (isNoPreference(seekerPref))
    return candidateStatus !== undefined ? 100 : 0;
  if (seekerPref === "occasionally") return 100;
  if (seekerPref === "yes" && candidateStatus === true) return 100;
  if (seekerPref === "no" && candidateStatus === false) return 100;
  return 1;
}
