import express from "express";
import { AuthController, sendOtp, verifyOtp } from "../../../controllers";
import { LoginValidation, SignupValidation } from "../../../validation";
import {
  authGatewayLimiter,
  otpGatewayLimiter
} from "../../../middleware/redisRateLimiter";
import authenticate from "../../../middleware/authMiddleware";
import { asyncHandler } from "../../../utils/utils";

const authRouter = express.Router();

authRouter.post(
  "/login",
  // authGatewayLimiter,
  LoginValidation,
  asyncHandler(AuthController.login)
);

authRouter.post(
  "/signup",
  authGatewayLimiter,
  SignupValidation,
  asyncHandler(AuthController.signup)
);

authRouter.get("/google/start", asyncHandler(AuthController.startGoogleAuth));
authRouter.get("/google/callback", asyncHandler(AuthController.googleCallback));
authRouter.post(
  "/google/callback",
  authGatewayLimiter,
  asyncHandler(AuthController.googleCallback)
);

authRouter.post(
  "/forgot-password",
  authGatewayLimiter,
  asyncHandler(AuthController.forgotPasswordRequest)
);

authRouter.post(
  "/reset-password/:token",
  authGatewayLimiter,
  asyncHandler(AuthController.resetPassword)
);

authRouter.post(
  "/send-email-otp",
  otpGatewayLimiter,
  asyncHandler(AuthController.sendEmailOtp)
);
authRouter.post(
  "/verify-email-otp",
  otpGatewayLimiter,
  asyncHandler(AuthController.verifySignupOtp)
);
authRouter.post("/send-sms-otp", otpGatewayLimiter, asyncHandler(sendOtp));
authRouter.post("/verify-sms-otp", otpGatewayLimiter, asyncHandler(verifyOtp));

authRouter.get("/me", authenticate, asyncHandler(AuthController.me));

authRouter.post("/logout", authenticate, asyncHandler(AuthController.logout));

export default authRouter;
