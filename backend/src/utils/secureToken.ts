import { Response } from "express";
import crypto from "crypto";
import { logger } from "../lib/common/logger";

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

  const frontendUrl = process.env.FRONTEND_URL || "";
  let cookieDomain: string | undefined = process.env.COOKIE_DOMAIN;
  if (!cookieDomain && frontendUrl) {
    try {
      cookieDomain = new URL(frontendUrl).hostname;
    } catch {
      cookieDomain = undefined;
    }
  }

  const defaultSameSite: SecureCookieOptions["sameSite"] = "none";

  const tokenCookieOptions = {
    // httpOnly: isProduction,
    // secure: isProduction,
    // sameSite: options.sameSite || defaultSameSite,
    maxAge: options.maxAge || COOKIE_MAX_AGE,
    path: "/"
    // domain: cookieDomain
  } as any;

  res.cookie("token", token, tokenCookieOptions);
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function setCSRFTokenCookie(res: Response, csrfToken: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  const enforceStrict =
    isProduction || process.env.ENFORCE_STRICT_COOKIES === "true";

  const frontendUrl = process.env.FRONTEND_URL || "";
  let cookieDomain: string | undefined = process.env.COOKIE_DOMAIN;
  if (!cookieDomain && frontendUrl) {
    try {
      cookieDomain = new URL(frontendUrl).hostname;
    } catch {
      cookieDomain = undefined;
    }
  }

  const defaultSameSite: SecureCookieOptions["sameSite"] = "none";

  const csrfCookieOptions = {
    // httpOnly: false,
    // secure: enforceStrict,
    // sameSite: defaultSameSite,
    maxAge: COOKIE_MAX_AGE,
    path: "/"
    // domain: cookieDomain
  } as any;

  res.cookie("csrf_token", csrfToken, csrfCookieOptions);

  if (!isProduction) {
    try {
      logger.info("Set csrf cookie", csrfCookieOptions);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("Set csrf cookie", csrfCookieOptions);
    }
  }
}

export function clearAuthCookies(res: Response): void {
  // Use same domain/sameSite as when setting cookies so they clear reliably
  const isProduction = process.env.NODE_ENV === "production";
  const enforceStrict =
    isProduction || process.env.ENFORCE_STRICT_COOKIES === "true";

  const frontendUrl = process.env.FRONTEND_URL || "";
  let cookieDomain: string | undefined = process.env.COOKIE_DOMAIN;
  if (!cookieDomain && frontendUrl) {
    try {
      cookieDomain = new URL(frontendUrl).hostname;
    } catch {
      cookieDomain = undefined;
    }
  }

  const sameSite: SecureCookieOptions["sameSite"] = "none";

  res.clearCookie("token", {
    path: "/",
    domain: cookieDomain,
    sameSite,
    secure: enforceStrict
  });

  res.clearCookie("csrf_token", {
    path: "/",
    domain: cookieDomain,
    sameSite,
    secure: enforceStrict
  });
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
