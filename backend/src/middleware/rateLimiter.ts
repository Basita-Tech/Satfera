import rateLimit from "express-rate-limit";
import { APP_CONFIG } from "../utils/constants";

export const authLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.AUTH.WINDOW_MS,
  max: APP_CONFIG.RATE_LIMIT.AUTH.MAX_REQUESTS,
  message: {
    success: false,
    message: APP_CONFIG.RATE_LIMIT.AUTH.MESSAGE
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

export const otpLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.OTP.WINDOW_MS,
  max: APP_CONFIG.RATE_LIMIT.OTP.MAX_REQUESTS,
  message: {
    success: false,
    message: APP_CONFIG.RATE_LIMIT.OTP.MESSAGE
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const apiLimiter = rateLimit({
  windowMs: APP_CONFIG.RATE_LIMIT.API.WINDOW_MS,
  max: APP_CONFIG.RATE_LIMIT.API.MAX_REQUESTS,
  message: {
    success: false,
    message: APP_CONFIG.RATE_LIMIT.API.MESSAGE
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === "/health";
  }
});
