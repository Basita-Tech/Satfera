import { logger } from "../lib/common/logger";

export function calculateAge(dateOfBirth?: Date): number | undefined {
  if (!dateOfBirth) return undefined;
  const birthDate = new Date(dateOfBirth);
  return Math.floor(
    (new Date().getTime() - birthDate.getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );
}

export function toArrayOfStrings(val: any): string[] {
  if (val == null) return [];
  if (val === 0) return ["0"];

  if (Array.isArray(val)) {
    return val
      .map((v) => {
        if (v == null) return "";
        return String(v).trim();
      })
      .filter(Boolean);
  }

  if (typeof val === "object") {
    try {
      const values = Object.values(val);
      return values
        .flat(2)
        .map((v) => {
          if (v == null) return "";
          return String(v).trim();
        })
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  if (typeof val === "string" || typeof val === "number") {
    const str = String(val).trim();
    return str ? [str] : [];
  }

  return [];
}

export function isNoPreference(val: any): boolean {
  if (val == null) return true;
  const arr = toArrayOfStrings(val);
  if (arr.length === 0) return true;
  const noPrefIndicators = ["no preference", "any"];
  return arr.some((v) => {
    const lower = v.toLowerCase().trim();
    return noPrefIndicators.some(
      (ind) => lower === ind || lower.includes(ind) || ind.includes(lower)
    );
  });
}

export function withDefaults(expect: any, defaults: any) {
  if (!expect) return { ...defaults };
  return { ...defaults, ...expect };
}

export function safeCompare(
  a: string | undefined,
  b: string | undefined
): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function arrayIncludesCaseInsensitive(
  arr: string[],
  value: string
): boolean {
  if (!arr || !value) return false;
  const lowerValue = value.toLowerCase();
  return arr.some((item) => item.toLowerCase() === lowerValue);
}

export function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
    logger.warn(`Invalid week number calculated: ${weekNum}, defaulting to 1`);
    return 1;
  }
  return weekNum;
}

export function isAffirmative(v: any): boolean {
  if (v === true) return true;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "yes" || s === "1";
  }
  return false;
}
