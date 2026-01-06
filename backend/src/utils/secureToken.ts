import { CookieOptions, Response } from "express";
import crypto from "crypto";
import { logger } from "../lib/common/logger";
import { APP_CONFIG } from "./constants";

const COOKIE_MAX_AGE = APP_CONFIG.COOKIE_MAX_AGE;

export interface SecureCookieOptions {
  maxAge?: number;
  sameSite?: "strict" | "lax" | "lax";
}

function getCookieDomain() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) return "satfera.in";

  return undefined;
}

/**
 * Set JWT token in HTTP-only cookie
 */
export function setSecureTokenCookie(
  res: Response,
  token: string,
  options: SecureCookieOptions = {}
): void {
  const isProduction = process.env.NODE_ENV === "production";

  const tokenCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: options.maxAge || COOKIE_MAX_AGE,
    path: "/",
    ...(getCookieDomain() && { domain: getCookieDomain() })
  };

  res.cookie("token", token, tokenCookieOptions);

  if (isProduction) {
    logger.info(
      `Cookie set in production: domain: ${getCookieDomain()}, secure: ${tokenCookieOptions.secure}, sameSite: ${tokenCookieOptions.sameSite}, httpOnly: ${tokenCookieOptions.httpOnly}, maxAge: ${tokenCookieOptions.maxAge}`
    );
  }
}

/**
 * CSRF Token Generation
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Set CSRF cookie (non-httpOnly)
 */
export function setCSRFTokenCookie(res: Response, csrfToken: string): void {
  const isProduction = process.env.NODE_ENV === "production";

  const csrfCookieOptions: CookieOptions = {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    ...(getCookieDomain() && { domain: getCookieDomain() })
  };

  res.cookie("csrf_token", csrfToken, csrfCookieOptions);

  if (!isProduction) {
    logger.info(`CSRF cookie set (dev): ${csrfCookieOptions}`);
  }
}

/**
 * Clear cookies safely across domains
 */
export function clearAuthCookies(res: Response): void {
  const isProduction = process.env.NODE_ENV === "production";

  const clearOptions: CookieOptions = {
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    ...(getCookieDomain() && { domain: getCookieDomain() })
  };

  res.clearCookie("token", clearOptions);
  res.clearCookie("csrf_token", clearOptions);

  if (isProduction) {
    logger.info(
      "Cookies cleared in production with domain:",
      getCookieDomain()
    );
  }
}

/**
 * Device Fingerprint
 */
export function generateDeviceFingerprint(
  userAgent: string,
  _ip?: string
): string {
  const ua = (userAgent || "").trim();
  return crypto.createHash("sha256").update(ua).digest("hex");
}

export function verifyDeviceFingerprint(
  storedFingerprint: string,
  currentUserAgent: string,
  _currentIp?: string
): boolean {
  const current = generateDeviceFingerprint(currentUserAgent);
  return storedFingerprint === current;
}
