import { Request, Response } from "express";
import { AuditLog } from "../../models/AuditLog";
import { formatDistanceToNow } from "date-fns";

export async function getAuditLogsController(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit || "25"), 10))
    );

    const filters: any = {};

    if (req.query.adminId) filters.adminId = req.query.adminId;
    if (req.query.action) filters.action = req.query.action;
    if (req.query.targetType) filters.targetType = req.query.targetType;
    if (req.query.targetId) filters.targetId = req.query.targetId;

    if (req.query.from)
      filters.createdAt = {
        ...(filters.createdAt || {}),
        $gte: new Date(String(req.query.from))
      };
    if (req.query.to)
      filters.createdAt = {
        ...(filters.createdAt || {}),
        $lte: new Date(String(req.query.to))
      };

    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      AuditLog.countDocuments(filters),
      AuditLog.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const transformed = items.map((it: any) => {
      const actor = it.adminName || it.adminEmail || "Admin";
      const humanAction = humanizeAction(it);
      const targetName =
        it.targetDisplayName || it.targetType || it.targetId || "";
      const timeAgo = it.createdAt
        ? shortRelativeTime(new Date(it.createdAt))
        : "";

      const display = `${actor} ${humanAction}${targetName ? " • " + targetName : ""}`;

      return {
        _id: it._id,
        display,
        createdAt: it.createdAt,
        timeAgo
      };
    });

    return res.status(200).json({
      success: true,
      data: transformed,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch audit logs"
    });
  }
}

function shortRelativeTime(date: Date) {
  try {
    const text = formatDistanceToNow(date, { addSuffix: true });
    return text
      .replace(" minutes", " mins")
      .replace(" minute", " min")
      .replace(" seconds", " secs")
      .replace(" second", " sec")
      .replace(" hours", " hrs")
      .replace(" hour", " hr");
  } catch (e) {
    return "just now";
  }
}

function humanizeAction(item: any) {
  const a = item.action || "";

  const map: Record<string, string> = {
    ApproveProfile: "Approved user profile",
    RejectProfile: "Rejected user profile",
    RectifyProfile: "Sent profile for rectification",
    CreateEmailTemplate: "Created email template",
    UpdateEmailTemplate: "Updated email template",
    DeleteEmailTemplate: "Deleted email template",
    ToggleEmailTemplateStatus: "Toggled email template status",
    CreatePricingConfig: "Created pricing config",
    UpdatePricingConfig: "Updated pricing config",
    DeletePricingConfig: "Deleted pricing config",
    RestoreAccount: "Restored user account",
    HardDeleteAccount: "Permanently deleted user account",
    SoftDeleteAccount: "Soft-deleted user account",
    ChangeUserPassword: "Changed user password",
    UpdateUserProfile: "Updated user profile",
    UpdateReportStatus: "Updated report status",
    UpdateSupportTicketStatus: "Updated support ticket status",
    AddSupportMessage: "Added support message"
  };

  if (map[a]) return map[a];

  const m = a.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i);
  if (m) {
    const path = m[2];
    if (path.includes("approve") && path.includes("profile"))
      return "Approved user profile";
    if (path.includes("reject") && path.includes("profile"))
      return "Rejected user profile";
    if (path.includes("rectify") && path.includes("profile"))
      return "Sent profile for rectification";
    if (path.includes("change-password")) return "Changed user password";
    if (path.includes("email-templates")) return "Modified email template";
    if (path.includes("pricing-configs")) return "Modified pricing config";
    if (path.includes("account") && path.includes("delete"))
      return "Deleted user account";
    return `${m[1]} ${path}`;
  }

  return String(a)
    .replace(/([A-Z])/g, " $1")
    .replace(/^ /, "")
    .trim();
}
