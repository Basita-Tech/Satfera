import { User } from "../../models";

export async function generateCustomId(gender: string): Promise<string> {
  const g = (gender || "").toLowerCase();
  const prefix = g === "female" ? "F" : g === "male" ? "M" : "O";
  const startNumber = parseInt(process.env.CUSTOM_ID_START || "1", 10) || 1;
  const padLength = 6;

  const regex = new RegExp(`^${prefix}\\d+$`);

  const latest: any = await (User as any)
    .findOne({ customId: { $regex: regex } })
    .sort({ customId: -1 })
    .lean()
    .exec();

  let nextNumber = startNumber;
  if (latest && latest.customId) {
    const numStr = latest.customId.substring(1);
    const parsed = parseInt(numStr, 10);
    if (!isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  const numStr = String(nextNumber).padStart(padLength, "0");
  return `${prefix}${numStr}`;
}
