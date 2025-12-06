import { Response } from "express";
import crypto from "crypto";
import { logger } from "../lib/common/logger";
import { env } from "../config/env";

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

  let cookieDomain: string | undefined = process.env.COOKIE_DOMAIN;
  if (!cookieDomain && env.FRONTEND_URLS && env.FRONTEND_URLS.length > 0) {
    try {
      const url = new URL(env.FRONTEND_URLS[0]);
      const hostname = url.hostname;
      const parts = hostname.split(".");

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        cookieDomain = undefined;
      } else if (parts.length > 2) {
        cookieDomain = "." + parts.slice(-2).join(".");
      } else {
        cookieDomain = hostname;
      }
    } catch {
      cookieDomain = undefined;
    }
  }

  const tokenCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    maxAge: options.maxAge || COOKIE_MAX_AGE,
    path: "/",
    ...(cookieDomain && { domain: cookieDomain })
  };

  res.cookie("token", token, tokenCookieOptions);
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function setCSRFTokenCookie(res: Response, csrfToken: string): void {
  const isProduction = process.env.NODE_ENV === "production";

  let cookieDomain: string | undefined = process.env.COOKIE_DOMAIN;
  if (!cookieDomain && env.FRONTEND_URLS && env.FRONTEND_URLS.length > 0) {
    try {
      const url = new URL(env.FRONTEND_URLS[0]);
      const hostname = url.hostname;
      const parts = hostname.split(".");

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        cookieDomain = undefined;
      } else if (parts.length > 2) {
        cookieDomain = "." + parts.slice(-2).join(".");
      } else {
        cookieDomain = hostname;
      }
    } catch {
      cookieDomain = undefined;
    }
  }

  const csrfCookieOptions = {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    ...(cookieDomain && { domain: cookieDomain })
  };

  res.cookie("csrf_token", csrfToken, csrfCookieOptions);

  if (!isProduction) {
    try {
      logger.info("Set csrf cookie", csrfCookieOptions);
    } catch (e) {
      console.log("Set csrf cookie", csrfCookieOptions);
    }
  }
}

export function clearAuthCookies(res: Response): void {
  const isProduction = process.env.NODE_ENV === "production";

  let cookieDomain: string | undefined = process.env.COOKIE_DOMAIN;
  if (!cookieDomain && env.FRONTEND_URLS && env.FRONTEND_URLS.length > 0) {
    try {
      const url = new URL(env.FRONTEND_URLS[0]);
      const hostname = url.hostname;
      const parts = hostname.split(".");

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        cookieDomain = undefined;
      } else if (parts.length > 2) {
        cookieDomain = "." + parts.slice(-2).join(".");
      } else {
        cookieDomain = hostname;
      }
    } catch {
      cookieDomain = undefined;
    }
  }

  const clearOptions = {
    path: "/",
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    secure: isProduction,
    ...(cookieDomain && { domain: cookieDomain })
  };

  res.clearCookie("token", clearOptions);
  res.clearCookie("csrf_token", clearOptions);
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
