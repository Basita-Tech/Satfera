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

  const normalize = (s: string) => s.trim().toLowerCase();

  function canonicalDiet(s: string): string {
    const x = normalize(s);
    if (x.includes("swamin")) return "swaminarayan";
    if (x.includes("jain")) return "jain";
    if (x.includes("egg")) return "eggetarian";
    if (x.includes("non") || x.includes("non-veg") || x.includes("nonveg"))
      return "non-vegetarian";
    if (
      (x.includes("veg") && x.includes("non")) ||
      x === "veg & non-veg" ||
      x === "veg & non veg" ||
      x === "both" ||
      x === "flexible"
    )
      return "veg & non-veg";
    if (x.includes("veget")) return "vegetarian";
    return x;
  }

  const include = prefDietsArray.filter(
    (p) => !p.toLowerCase().startsWith("not ")
  );
  const exclude = prefDietsArray
    .filter((p) => p.toLowerCase().startsWith("not "))
    .map((p) => canonicalDiet(p.slice(4)));

  const allKnown = [
    "vegetarian",
    "non-vegetarian",
    "eggetarian",
    "jain",
    "swaminarayan",
    "veg & non-veg"
  ];

  const mapPrefToAllowed = (pref: string): string[] => {
    const p = canonicalDiet(pref);
    switch (p) {
      case "swaminarayan":
        return ["swaminarayan"];
      case "jain":
        return ["jain"];
      case "eggetarian":
        return ["eggetarian", "vegetarian", "swaminarayan"];
      case "vegetarian":
        return ["vegetarian", "jain", "swaminarayan"];
      case "non-vegetarian":
      case "veg & non-veg":
        return allKnown.slice();
      default:
        return [p];
    }
  };

  const allowed = new Set<string>();
  if (include.length === 0) {
    allKnown.forEach((d) => allowed.add(d));
  } else {
    include.forEach((pref) => {
      mapPrefToAllowed(pref).forEach((d) => allowed.add(d));
    });
  }

  exclude.forEach((exc) => {
    for (const a of Array.from(allowed)) {
      if (a === exc) allowed.delete(a);
    }
  });

  if (allowed.size === 0) return 1;

  const candCanon = candidateDietArray.map((d) => canonicalDiet(d));
  const matches = candCanon.some((c) => allowed.has(c));
  return matches ? 100 : 1;
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
