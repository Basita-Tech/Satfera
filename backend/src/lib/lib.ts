export function parseDDMMYYYYToDate(value?: string): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const parts = value.split("-");
  if (parts.length !== 3) return undefined;
  const partDay = parts[0] ?? "";
  const partMonth = parts[1] ?? "";
  const partYear = parts[2] ?? "";
  const day = parseInt(partDay, 10);
  const month = parseInt(partMonth, 10);
  const year = parseInt(partYear, 10);
  if (
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return undefined;
  const iso = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d;
}
