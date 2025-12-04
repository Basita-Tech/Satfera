import { redisClient, safeRedisOperation } from ".";

const OTP_ATTEMPT_LIMIT = 3;
const OTP_RESEND_LIMIT = 5;
const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes
const ATTEMPT_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

function getOtpKey(email: string, context: "signup" | "forgot-password") {
  return `otp:${context}:${email.toLowerCase()}`;
}
function getAttemptKey(email: string, context: "signup" | "forgot-password") {
  return `otp_attempts:${context}:${email.toLowerCase()}`;
}
function getResendKey(email: string, context: "signup" | "forgot-password") {
  return `otp_resend:${context}:${email.toLowerCase()}`;
}
function getOtpTimestampKey(
  email: string,
  context: "signup" | "forgot-password"
) {
  return `otp_timestamp:${context}:${email.toLowerCase()}`;
}

export async function setOtp(
  email: string,
  otp: string,
  context: "signup" | "forgot-password"
) {
  const result = await safeRedisOperation(async () => {
    const otpKey = getOtpKey(email, context);
    const timestampKey = getOtpTimestampKey(email, context);

    // Store OTP with expiry
    await redisClient.set(otpKey, otp, {
      EX: OTP_EXPIRY_SECONDS
    });

    // Store timestamp for better expiry tracking
    await redisClient.set(timestampKey, Date.now().toString(), {
      EX: OTP_EXPIRY_SECONDS
    });

    // Reset attempt counter when new OTP is generated
    await redisClient.del(getAttemptKey(email, context));

    return true;
  }, "Set OTP");

  if (!result) {
    throw new Error("Failed to store OTP. Please try again.");
  }
}

export async function getOtp(
  email: string,
  context: "signup" | "forgot-password"
) {
  return safeRedisOperation(async () => {
    return redisClient.get(getOtpKey(email, context));
  }, "Get OTP");
}

export async function getOtpWithExpiry(
  email: string,
  context: "signup" | "forgot-password"
): Promise<{ otp: string | null; expiresIn: number | null }> {
  const result = await safeRedisOperation(async () => {
    const otpKey = getOtpKey(email, context);
    const timestampKey = getOtpTimestampKey(email, context);

    const [otp, timestamp, ttl] = await Promise.all([
      redisClient.get(otpKey),
      redisClient.get(timestampKey),
      redisClient.ttl(otpKey)
    ]);

    return { otp, timestamp, ttl };
  }, "Get OTP with expiry");

  if (!result) {
    return { otp: null, expiresIn: null };
  }

  return {
    otp: result.otp,
    expiresIn: result.ttl > 0 ? result.ttl : null
  };
}

export async function incrementAttempt(
  email: string,
  context: "signup" | "forgot-password"
) {
  const result = await safeRedisOperation(async () => {
    const key = getAttemptKey(email, context);
    const attempts = await redisClient.incr(key);
    if (attempts === 1) {
      await redisClient.expire(key, ATTEMPT_EXPIRY_SECONDS);
    }
    return attempts;
  }, "Increment attempt");

  return result || 0;
}

export async function getAttemptCount(
  email: string,
  context: "signup" | "forgot-password"
) {
  const val = await safeRedisOperation(async () => {
    return redisClient.get(getAttemptKey(email, context));
  }, "Get attempt count");

  return val ? parseInt(val, 10) : 0;
}

export async function incrementResend(
  email: string,
  context: "signup" | "forgot-password"
) {
  const result = await safeRedisOperation(async () => {
    const key = getResendKey(email, context);
    const resends = await redisClient.incr(key);
    if (resends === 1) {
      await redisClient.expire(key, ATTEMPT_EXPIRY_SECONDS);
    }
    return resends;
  }, "Increment resend");

  return result || 0;
}

export async function getResendCount(
  email: string,
  context: "signup" | "forgot-password"
) {
  const val = await safeRedisOperation(async () => {
    return redisClient.get(getResendKey(email, context));
  }, "Get resend count");

  return val ? parseInt(val, 10) : 0;
}

export async function clearOtpData(
  email: string,
  context: "signup" | "forgot-password"
) {
  await safeRedisOperation(async () => {
    const keys = [
      getOtpKey(email, context),
      getAttemptKey(email, context),
      getResendKey(email, context),
      getOtpTimestampKey(email, context)
    ];
    await redisClient.del(keys);
  }, "Clear OTP data");
}

export { OTP_ATTEMPT_LIMIT, OTP_RESEND_LIMIT, OTP_EXPIRY_SECONDS };
