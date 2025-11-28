import express from "express";
import { AuthController, sendOtp, verifyOtp } from "../../../controllers";
import { LoginValidation, SignupValidation } from "../../../validation";
import { authLimiter, otpLimiter } from "../../../middleware/rateLimiter";
import { bruteForceProtection } from "../../../middleware/bruteForceProtection";
import authenticate from "../../../middleware/authMiddleware";

const authRouter = express.Router();

authRouter.post(
  "/login",
  bruteForceProtection({ maxAttempts: 5, lockoutDuration: 900 }),
  authLimiter,
  LoginValidation,
  AuthController.login
);

authRouter.post(
  "/signup",
  authLimiter,
  SignupValidation,
  AuthController.signup
);

authRouter.get("/google/start", AuthController.startGoogleAuth);
authRouter.get("/google/callback", AuthController.googleCallback);

authRouter.post(
  "/forgot-password",
  bruteForceProtection({ maxAttempts: 3, lockoutDuration: 1800 }),
  authLimiter,
  AuthController.forgotPasswordRequest
);

authRouter.post(
  "/reset-password/:token",
  authLimiter,
  AuthController.resetPassword
);

authRouter.post("/send-email-otp", otpLimiter, AuthController.sendEmailOtp);
authRouter.post(
  "/verify-email-otp",
  otpLimiter,
  AuthController.verifySignupOtp
);
authRouter.post("/send-sms-otp", otpLimiter, sendOtp);
authRouter.post("/verify-sms-otp", otpLimiter, verifyOtp);

authRouter.get("/me", authenticate, AuthController.me);

authRouter.post("/logout", authenticate, AuthController.logout);

export default authRouter;
