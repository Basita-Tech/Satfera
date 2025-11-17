import express from "express";
import { AuthController, sendOtp, verifyOtp } from "../../../controllers";
import { LoginValidation, SignupValidation } from "../../../validation";
import { authLimiter, otpLimiter } from "../../../middleware/rateLimiter";

const authRouter = express.Router();

authRouter.post("/login", authLimiter, LoginValidation, AuthController.login);
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

export default authRouter;
