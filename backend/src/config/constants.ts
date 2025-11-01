export const APP_CONFIG = {
  JWT_EXPIRES_IN: "7d",

  COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000,

  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  OTP_EXPIRY_SECONDS: 5 * 60,
  OTP_ATTEMPT_LIMIT: 5,
  OTP_RESEND_LIMIT: 5,
  OTP_ATTEMPT_EXPIRY_SECONDS: 24 * 60 * 60,

  RATE_LIMIT: {
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX_REQUESTS: 5,
      MESSAGE: "Too many authentication attempts. Please try again later.",
    },
    OTP: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX_REQUESTS: 5,
      MESSAGE: "Too many OTP requests. Please try again later.",
    },
    API: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX_REQUESTS: 100000000,
      MESSAGE: "Too many requests. Please try again later.",
    },
  },

  REDIS: {
    MAX_RETRIES: 5,
    RETRY_DELAY: 5000,
    CONNECT_TIMEOUT: 10000,
  },

  MONGO: {
    MAX_POOL_SIZE: 10,
    MIN_POOL_SIZE: 2,
    SERVER_SELECTION_TIMEOUT_MS: 10000,
    SOCKET_TIMEOUT_MS: 45000,
    CONNECT_TIMEOUT_MS: 10000,
    HEARTBEAT_FREQUENCY_MS: 10000,
  },

  PASSWORD: {
    MIN_LENGTH: 6,
    BCRYPT_ROUNDS: 10,
  },

  AGE_LIMITS: {
    MALE_MIN: 21,
    FEMALE_MIN: 20,
    GENERAL_MIN: 18,
    MAX: 100,
  },

  BRAND_NAME: "Satfera",
};

export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  INVALID_FORMAT: (field: string) => `Invalid ${field} format`,
  MIN_LENGTH: (field: string, length: number) =>
    `${field} must be at least ${length} characters long`,
  MAX_LENGTH: (field: string, length: number) =>
    `${field} must not exceed ${length} characters`,
  INVALID_VALUE: (field: string) => `Invalid value for ${field}`,
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid credentials",
  EMAIL_NOT_VERIFIED: "Please verify your email before logging in.",
  PHONE_NOT_VERIFIED: "Please verify your phone number before logging in.",
  ACCOUNT_DISABLED: "Account has been disabled",
  TOKEN_EXPIRED: "Token has expired",
  INVALID_TOKEN: "Invalid token",
  UNAUTHORIZED: "Authentication required",

  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User already exists",
  EMAIL_IN_USE: "Email already in use",
  PHONE_IN_USE: "Phone number already in use",

  OTP_EXPIRED: "OTP has expired. Please request a new one.",
  OTP_INVALID: "Invalid OTP",
  OTP_LIMIT_REACHED: "Maximum OTP verification attempts reached.",
  OTP_RESEND_LIMIT: "OTP resend limit reached for today. Try again tomorrow.",

  SERVER_ERROR: "Internal server error",
  RESOURCE_NOT_FOUND: (resource: string) => `${resource} not found`,
  ALREADY_EXISTS: (resource: string) => `${resource} already exists`,
  OPERATION_FAILED: (operation: string) => `${operation} failed`,
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  SIGNUP_SUCCESS:
    "Signup successful. Please verify your email and phone number to login.",
  OTP_SENT: "OTP sent successfully",
  OTP_VERIFIED: "OTP verified successfully",
  PASSWORD_RESET: "Password reset successful",
  UPDATE_SUCCESS: "Updated successfully",
  CREATE_SUCCESS: "Created successfully",
  DELETE_SUCCESS: "Deleted successfully",
};
