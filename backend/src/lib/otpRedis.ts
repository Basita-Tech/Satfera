import { redisClient } from "./redis";

const OTP_ATTEMPT_LIMIT = 4;
const OTP_RESEND_LIMIT = 3;
const OTP_EXPIRY_SECONDS = 5 * 60;
const ATTEMPT_EXPIRY_SECONDS = 24 * 60 * 60;

function getOtpKey(email: string, context: "signup" | "forgot-password") {
  return `otp:${context}:${email.toLowerCase()}`;
}
function getAttemptKey(email: string, context: "signup" | "forgot-password") {
  return `otp_attempts:${context}:${email.toLowerCase()}`;
}
function getResendKey(email: string, context: "signup" | "forgot-password") {
  return `otp_resend:${context}:${email.toLowerCase()}`;
}

export async function setOtp(
  email: string,
  otp: string,
  context: "signup" | "forgot-password"
) {
  await redisClient.set(getOtpKey(email, context), otp, {
    EX: OTP_EXPIRY_SECONDS,
  });
  await redisClient.del(getAttemptKey(email, context));
}

export async function getOtp(
  email: string,
  context: "signup" | "forgot-password"
) {
  return redisClient.get(getOtpKey(email, context));
}

export async function incrementAttempt(
  email: string,
  context: "signup" | "forgot-password"
) {
  const key = getAttemptKey(email, context);
  const attempts = await redisClient.incr(key);
  if (attempts === 1) {
    await redisClient.expire(key, ATTEMPT_EXPIRY_SECONDS);
  }
  return attempts;
}

export async function getAttemptCount(
  email: string,
  context: "signup" | "forgot-password"
) {
  const val = await redisClient.get(getAttemptKey(email, context));
  return val ? parseInt(val, 10) : 0;
}

export async function incrementResend(
  email: string,
  context: "signup" | "forgot-password"
) {
  const key = getResendKey(email, context);
  const resends = await redisClient.incr(key);
  if (resends === 1) {
    await redisClient.expire(key, ATTEMPT_EXPIRY_SECONDS);
  }
  return resends;
}

export async function getResendCount(
  email: string,
  context: "signup" | "forgot-password"
) {
  const val = await redisClient.get(getResendKey(email, context));
  return val ? parseInt(val, 10) : 0;
}

export { OTP_ATTEMPT_LIMIT, OTP_RESEND_LIMIT };
