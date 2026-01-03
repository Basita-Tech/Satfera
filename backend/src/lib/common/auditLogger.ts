import { Request } from "express";
import { AuditLog } from "../../models/AuditLog";
import { logError } from "./logger";

type RecordAuditInput = {
  adminId: string | any;
  adminName: string;
  adminEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string | any;
  targetDisplayName?: string;
  details?: any;
  metadata?: any;
  req?: Request;
};

const sanitizeDetails = (d: any) => {
  if (!d) return undefined;
  try {
    const clone = Array.isArray(d) ? [...d] : { ...d };
    delete (clone as any).password;
    delete (clone as any).file;
    delete (clone as any).files;
    return clone;
  } catch (e) {
    return undefined;
  }
};

export async function recordAudit(input: RecordAuditInput) {
  try {
    const ip =
      (input.req &&
        ((input.req.headers["x-forwarded-for"] as string) || input.req.ip)) ||
      undefined;
    const userAgent = input.req?.headers["user-agent"] as string | undefined;

    const doc = {
      adminId: input.adminId,
      adminName: input.adminName,
      adminEmail: input.adminEmail,
      action: input.action,
      targetType: input.targetType,
      targetDisplayName: input.targetDisplayName,
      targetId: input.targetId,
      details: sanitizeDetails(input.details),
      metadata: input.metadata,
      ip,
      userAgent
    } as any;

    await AuditLog.create(doc);
  } catch (error: any) {
    logError(error, "recordAudit");
  }
}

export default { recordAudit };
