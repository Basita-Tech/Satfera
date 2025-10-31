import express from "express";
import { AuthController } from "../controllers/authControllers";
import { LoginValidation, SignupValidation } from "../validation/validation";
import { sendOtp, verifyOtp } from "../controllers/twilioSmsController";

const authRouter = express.Router();

authRouter.post("/login", LoginValidation, AuthController.login);
authRouter.post("/signup", SignupValidation, AuthController.signup);
authRouter.post("/google", AuthController.googleAuth);

authRouter.post("/forgot-password", AuthController.forgotPasswordRequest);
authRouter.post("/reset-password/:token", AuthController.resetPassword);

authRouter.post("/send-email-otp", AuthController.sendEmailOtp);
authRouter.post("/verify-email-otp", AuthController.verifySignupOtp);

authRouter.post("/send-sms-otp", sendOtp);
authRouter.post("/verify-sms-otp", verifyOtp);

export default authRouter;
