import { Request, Response } from "express";
import * as adminService from "../../services/userServices";

export async function approveUserProfileController(
  req: Request,
  res: Response
) {
  const { userId } = req.body;
  const result = await adminService.approveUserProfileService(userId);
  return res.status(result.success ? 200 : 400).json(result);
}

export async function rejectUserProfileController(req: Request, res: Response) {
  const { userId, reason } = req.body;
  const result = await adminService.rejectUserProfileService(userId, reason);
  return res.status(result.success ? 200 : 400).json(result);
}

export async function getPendingProfilesController(
  req: Request,
  res: Response
) {
  const result = await adminService.getPendingProfilesService();
  return res.status(result.success ? 200 : 400).json(result);
}

export async function verifiedProfilesController(req: Request, res: Response) {
  const { userId } = req.params;
  const result = await adminService.toggleVerificationService(userId, true);
  return res.status(result.success ? 200 : 400).json(result);
}

export async function unVerifiedProfilesController(
  req: Request,
  res: Response
) {
  const { userId } = req.params;
  const result = await adminService.toggleVerificationService(userId, false);
  return res.status(result.success ? 200 : 400).json(result);
}
