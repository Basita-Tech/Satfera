import express from "express";
import { AuthController } from "../controllers/authControllers";
import { LoginValidation, SignupValidation } from "../validation/validation";
import { sendOtp, verifyOtp } from "../controllers/twilioSmsController";

const authRouter = express.Router();

authRouter.post("/login", LoginValidation, AuthController.login);
authRouter.post("/signup", SignupValidation, AuthController.signup);
authRouter.post("/forgot-password", AuthController.forgotPasswordRequest);
authRouter.post("/reset-password/:token", AuthController.resetPassword);

authRouter.post("/send-otp", AuthController.sendEmailOtp);
authRouter.post("/verify-otp", AuthController.verifySignupOtp);

authRouter.post("/send-sms", sendOtp);

authRouter.post("/verify-sms", verifyOtp);

export default authRouter;
