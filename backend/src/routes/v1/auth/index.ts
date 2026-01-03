import express from "express";
import { AuthController, sendOtp, verifyOtp } from "../../../controllers";
import { LoginValidation, SignupValidation } from "../../../validation";
import { authGatewayLimiter, otpGatewayLimiter } from "../../../middleware/redisRateLimiter";
import authenticate from "../../../middleware/authMiddleware";

const authRouter = express.Router();

authRouter.post(
  "/login",
  // authGatewayLimiter,
  LoginValidation,
  AuthController.login
);

authRouter.post(
  "/signup",
  authGatewayLimiter,
  SignupValidation,
  AuthController.signup
);

authRouter.get("/google/start", AuthController.startGoogleAuth);
authRouter.get("/google/callback", AuthController.googleCallback);
authRouter.post("/google/callback", authGatewayLimiter, AuthController.googleCallback);

authRouter.post(
  "/forgot-password",
  authGatewayLimiter,
  AuthController.forgotPasswordRequest
);

authRouter.post(
  "/reset-password/:token",
  authGatewayLimiter,
  AuthController.resetPassword
);

authRouter.post("/send-email-otp", otpGatewayLimiter, AuthController.sendEmailOtp);
authRouter.post(
  "/verify-email-otp",
  otpGatewayLimiter,
  AuthController.verifySignupOtp
);
authRouter.post("/send-sms-otp", otpGatewayLimiter, sendOtp);
authRouter.post("/verify-sms-otp", otpGatewayLimiter, verifyOtp);

authRouter.get("/me", authenticate, AuthController.me);

authRouter.post("/logout", authenticate, AuthController.logout);

export default authRouter;
