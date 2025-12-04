import { User } from "../../models";

export async function isEitherBlocked(
  userAId: string,
  userBId: string
): Promise<boolean> {
  if (!userAId || !userBId) return false;
  const [a, b] = await Promise.all([
    User.findById(userAId).select("blockedUsers").lean(),
    User.findById(userBId).select("blockedUsers").lean()
  ]);

  const aBlocked = Array.isArray((a as any)?.blockedUsers)
    ? (a as any).blockedUsers.map((id: any) => String(id))
    : [];
  const bBlocked = Array.isArray((b as any)?.blockedUsers)
    ? (b as any).blockedUsers.map((id: any) => String(id))
    : [];

  return (
    aBlocked.includes(String(userBId)) || bBlocked.includes(String(userAId))
  );
}

export async function isBlockedBy(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  if (!userId || !otherUserId) return false;
  const other = await User.findById(otherUserId).select("blockedUsers").lean();
  const blocked = Array.isArray((other as any)?.blockedUsers)
    ? (other as any).blockedUsers.map((id: any) => String(id))
    : [];
  return blocked.includes(String(userId));
}
