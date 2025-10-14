import express from "express";
import { AuthController } from "../controllers/authControllers";
import { LoginValidation, SignupValidation } from "../validation/validation";

const authRouter = express.Router();

authRouter.post("/login", LoginValidation, AuthController.login);
authRouter.post("/signup", SignupValidation, AuthController.signup);
authRouter.post("/forgot-password", AuthController.forgotPasswordRequest);
authRouter.post("/reset-password", AuthController.resetPassword);

authRouter.post("/verify-otp", AuthController.verifySignupOtp);

export default authRouter;
