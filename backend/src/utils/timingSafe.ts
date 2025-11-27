import crypto from "crypto";
import { logger } from "../lib/common/logger";

/**
 * Timing-safe utilities to prevent timing attacks
 * All authentication operations should use constant-time comparisons
 */

/**
 * Constant-time string comparison
 * Prevents timing attacks by ensuring comparison takes the same time regardless of where strings differ
 */
export const timingSafeEqual = (a: string, b: string): boolean => {
  try {
    const bufferA = Buffer.from(
      crypto.createHash("sha256").update(a).digest("hex")
    );
    const bufferB = Buffer.from(
      crypto.createHash("sha256").update(b).digest("hex")
    );

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    const dummyBuffer = Buffer.alloc(32);
    crypto.timingSafeEqual(dummyBuffer, dummyBuffer);
    return false;
  }
};

/**
 * Add artificial delay to make all authentication responses take similar time
 * This prevents timing attacks that could reveal whether a user exists
 */
export const addConstantTimeDelay = async (
  startTime: number,
  targetDuration: number = 200
): Promise<void> => {
  const elapsed = Date.now() - startTime;
  const delay = Math.max(0, targetDuration - elapsed);

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
};

/**
 * Constant-time user lookup wrapper
 * Always takes the same amount of time regardless of whether user exists
 */
export const constantTimeUserLookup = async <T>(
  lookupFn: () => Promise<T | null>,
  minDuration: number = 100
): Promise<T | null> => {
  const startTime = Date.now();

  let result: T | null = null;
  try {
    result = await lookupFn();
    await addConstantTimeDelay(startTime, minDuration);
    return result;
  } catch (error) {
    await addConstantTimeDelay(startTime, minDuration);
    throw error;
  }
}; /**
 * Generate a cryptographically secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Generate a cryptographically secure OTP
 */
export const generateSecureOTP = (length: number = 6): string => {
  const max = Math.pow(10, length);
  const randomValue = crypto.randomInt(0, max);
  return randomValue.toString().padStart(length, "0");
};

/**
 * Hash sensitive data for comparison
 * Use this for comparing tokens, OTPs, etc.
 */
export const hashForComparison = (data: string): string => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

/**
 * Constant-time OTP verification
 */
export const verifyOTPConstantTime = async (
  providedOTP: string,
  storedOTP: string,
  minDuration: number = 50
): Promise<boolean> => {
  const startTime = Date.now();

  try {
    const hashedProvided = hashForComparison(providedOTP);
    const hashedStored = hashForComparison(storedOTP);

    const isValid = timingSafeEqual(hashedProvided, hashedStored);

    await addConstantTimeDelay(startTime, minDuration);
    return isValid;
  } catch (error) {
    await addConstantTimeDelay(startTime, minDuration);
    return false;
  }
};

/**
 * Generate a unique token identifier (JTI) for JWT
 */
export const generateJTI = (): string => {
  return `${Date.now()}-${generateSecureToken(16)}`;
};

/**
 * Secure password validation with constant time
 * This wrapper ensures password validation timing doesn't leak information
 */
export const constantTimePasswordValidation = async (
  validationFn: () => Promise<boolean>,
  minDuration: number = 200
): Promise<boolean> => {
  const startTime = Date.now();

  try {
    const result = await validationFn();
    await addConstantTimeDelay(startTime, minDuration);
    return result;
  } catch (error) {
    await addConstantTimeDelay(startTime, minDuration);
    return false;
  }
};

/**
 * Timing-safe authentication response wrapper
 * Ensures all authentication responses take similar time
 */
export class TimingSafeAuth {
  private startTime: number;
  private targetDuration: number;

  constructor(targetDuration: number = 200) {
    this.startTime = Date.now();
    this.targetDuration = targetDuration;
  }

  /**
   * Complete the authentication and ensure constant timing
   */
  async complete<T>(result: T): Promise<T> {
    await addConstantTimeDelay(this.startTime, this.targetDuration);
    return result;
  }

  /**
   * Fail the authentication and ensure constant timing
   */
  async fail(error: Error): Promise<never> {
    await addConstantTimeDelay(this.startTime, this.targetDuration);
    throw error;
  }
}

/**
 * Secure random delay to prevent timing analysis
 * Adds a small random delay (within a range) to make timing attacks harder
 */
export const addRandomJitter = async (
  minMs: number = 10,
  maxMs: number = 50
): Promise<void> => {
  const delay = crypto.randomInt(minMs, maxMs + 1);
  await new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Sanitize timing information from error messages
 */
export const sanitizeTimingError = (error: any): Error => {
  const sanitizedMessage = error.message
    ?.replace(/\d+ms/g, "XXXms")
    ?.replace(/\d+\.\d+s/g, "X.XXs")
    ?.replace(/took \d+/g, "took XXX");

  return new Error(sanitizedMessage || "Authentication failed");
};

/**
 * Rate limit key generator with timing safety
 * Ensures key generation timing doesn't leak user existence
 */
export const generateRateLimitKey = (
  identifier: string,
  type: string = "login"
): string => {
  const hashedIdentifier = crypto
    .createHash("sha256")
    .update(identifier.toLowerCase().trim())
    .digest("hex")
    .substring(0, 16);

  return `rate_limit:${type}:${hashedIdentifier}`;
};

/**
 * Constant-time email/phone validation
 * Validates format without revealing whether the format is valid through timing
 */
export const constantTimeFormatValidation = async (
  value: string,
  validationFn: (val: string) => boolean,
  minDuration: number = 10
): Promise<boolean> => {
  const startTime = Date.now();

  try {
    const isValid = validationFn(value);
    await addConstantTimeDelay(startTime, minDuration);
    return isValid;
  } catch (error) {
    await addConstantTimeDelay(startTime, minDuration);
    return false;
  }
};
