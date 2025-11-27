import { Response } from "express";
import crypto from "crypto";

/**
 * Secure Token Management Utilities
 * Provides HTTP-only cookie management and CSRF protection
 */

const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

export interface SecureCookieOptions {
  maxAge?: number;
  sameSite?: "strict" | "lax" | "none";
}

/**
 * Set JWT token in HTTP-only cookie (not accessible via JavaScript)
 */
export function setSecureTokenCookie(
  res: Response,
  token: string,
  options: SecureCookieOptions = {}
): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: options.sameSite || "strict",
    maxAge: options.maxAge || COOKIE_MAX_AGE,
    path: "/",
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined
  });
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function setCSRFTokenCookie(res: Response, csrfToken: string): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("csrf_token", csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("token", { path: "/" });
  res.clearCookie("csrf_token", { path: "/" });
}

/**
 * Generate device fingerprint hash for additional security
 * This binds the token to a specific device
 */
export function generateDeviceFingerprint(
  userAgent: string,
  ip: string
): string {
  const fingerprint = `${userAgent}:${ip}`;
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

/**
 * Verify device fingerprint matches
 */
export function verifyDeviceFingerprint(
  storedFingerprint: string,
  currentUserAgent: string,
  currentIp: string
): boolean {
  const currentFingerprint = generateDeviceFingerprint(
    currentUserAgent,
    currentIp
  );
  return storedFingerprint === currentFingerprint;
}
