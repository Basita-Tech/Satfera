import { Request, Response, NextFunction } from "express";
import { recordAudit } from "../lib/common/auditLogger";

export default function adminAuditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isAdmin = !!(req as any).user && (req as any).user.role === "admin";
  if (!isAdmin) return next();

  const start = Date.now();

  res.on("finish", async () => {
    try {
      if (req.method === "GET") return;

      if (res.statusCode < 200 || res.statusCode >= 400) return;

      const admin = (req as any).user;

      const targetId =
        req.params.userId || (req.body && (req.body.userId || req.body.id));
      const targetType = targetId ? "User" : undefined;

      await recordAudit({
        adminId: admin.id,
        adminName: admin.fullName || admin.email || "Admin",
        adminEmail: admin.email,
        action: `${req.method} ${req.path}`,
        targetType,
        targetId,
        details: { statusCode: res.statusCode, durationMs: Date.now() - start },
        req
      });
    } catch (e) {}
  });

  next();
}
