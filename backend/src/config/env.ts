import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGO_URI: string;
  JWT_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  MAIL_FROM: string | undefined;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_VERIFY_SERVICE_SID: string;
  TWILIO_PHONE_NUMBER: string;
  REDIS_URL: string;
  FRONTEND_URL: string;
  SUPPORT_CONTACT: string | undefined;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  MAX_FILE_SIZE: number;
  MAX_PERSONAL_PHOTOS: number;
  MAX_OTHER_PHOTOS: number;
}

export function validateEnv(): EnvConfig {
  const requiredVars = [
    "MONGO_URI",
    "JWT_SECRET",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID",
    "TWILIO_PHONE_NUMBER",
    "REDIS_URL",
    "FRONTEND_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing
        .map((v) => `  - ${v}`)
        .join("\n")}\n\nPlease check your .env file.`
    );
  }

  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters long for security"
    );
  }

  const frontendUrl = process.env.FRONTEND_URL!;
  try {
    new URL(frontendUrl);
  } catch (error) {
    throw new Error(`FRONTEND_URL is not a valid URL: ${frontendUrl}`);
  }

  const mongoUri = process.env.MONGO_URI!;
  if (
    !mongoUri.startsWith("mongodb://") &&
    !mongoUri.startsWith("mongodb+srv://")
  ) {
    throw new Error(`MONGO_URI must start with mongodb:// or mongodb+srv://`);
  }

  const redisUrl = process.env.REDIS_URL!;
  if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
    throw new Error(`REDIS_URL must start with redis:// or rediss://`);
  }

  return {
    PORT: parseInt(process.env.PORT || "3000", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    MONGO_URI: mongoUri,
    JWT_SECRET: jwtSecret,
    SMTP_HOST: process.env.SMTP_HOST!,
    SMTP_PORT: parseInt(process.env.SMTP_PORT!, 10),
    SMTP_SECURE: process.env.SMTP_SECURE === "true",
    SMTP_USER: process.env.SMTP_USER!,
    SMTP_PASS: process.env.SMTP_PASS!,
    MAIL_FROM: process.env.MAIL_FROM,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
    TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID!,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
    REDIS_URL: redisUrl,
    FRONTEND_URL: frontendUrl,
    SUPPORT_CONTACT: process.env.SUPPORT_CONTACT,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "2097152", 10),
    MAX_PERSONAL_PHOTOS: parseInt(process.env.MAX_PERSONAL_PHOTOS || "1", 10),
    MAX_OTHER_PHOTOS: parseInt(process.env.MAX_OTHER_PHOTOS || "2", 10)
  };
}

let env: EnvConfig;

try {
  env = validateEnv();
  console.log("Environment variables validated successfully");
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

export { env };
