import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { LoginRequest } from "../types/types";
import { AuthService } from "../services/authServices";
import { generateOtp } from "../lib/otp";
import { sendOtpEmail } from "../lib/email";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  setOtp as setRedisOtp,
  getOtp as getRedisOtp,
  incrementResend,
  getResendCount,
  OTP_RESEND_LIMIT,
} from "../lib/otpRedis";
import { User } from "../models/User";
import { redisClient } from "../lib/redis";

const authService = new AuthService();

export class AuthController {
  static async login(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const pretty = (param: string | undefined) => {
        if (!param) return "body";
        const map: Record<string, string> = {
          dateOfBirth: "date Of Birth",
          timeOfBirth: "time Of Birth",
          full_address: "full address",
          userId: "User ID",
        };
        return map[param] || param;
      };

      return res.status(400).json({
        success: false,
        errors: errors.array().map((e: any) => ({
          field: pretty(e.param) || e.location || "body",
          message:
            e.msg && e.msg !== "Invalid value"
              ? e.msg
              : `Invalid value provided${
                  typeof e.value !== "undefined"
                    ? `: ${JSON.stringify(e.value)}`
                    : ""
                }`,
          value: e.value,
        })),
      });
    }

    const { email, phoneNumber, password }: LoginRequest = req.body;

    try {
      if (!password || (!email && !phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Email or phone number and password are required",
        });
      }

      if (email && password) {
        const result = await authService.loginWithEmail(email, password);
        if (!result) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid credentials" });
        }
        const userObj = result.user.toObject
          ? result.user.toObject()
          : result.user;
        const {
          role,
          id,
          for_Profile,
          isEmailLoginEnabled,
          isMobileLoginEnabled,
          ...publicUser
        } = userObj as any;
        res.cookie("token", result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: "strict",
        });
        return res.status(200).json({ user: publicUser, token: result.token });
      }

      if (phoneNumber && password) {
        const result = await authService.loginWithPhone(phoneNumber, password);
        if (!result) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid credentials" });
        }
        const userObj = result.user.toObject
          ? result.user.toObject()
          : result.user;

        const {
          role,
          id,
          for_Profile,
          isEmailLoginEnabled,
          isMobileLoginEnabled,
          ...publicUser
        } = userObj as any;

        res.cookie("token", result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({ user: publicUser, token: result.token });
      }
    } catch (error) {
      const message = (error as Error)?.message || "Login failed";
      return res.status(500).json({ success: false, message });
    }
  }

  static async signup(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const pretty = (param: string | undefined) => {
        if (!param) return "body";
        const map: Record<string, string> = {
          dateOfBirth: "date Of Birth",
          timeOfBirth: "time Of Birth",
          full_address: "full address",
          userId: "User ID",
        };
        return map[param] || param;
      };

      return res.status(400).json({
        success: false,
        errors: errors.array().map((e: any) => ({
          field: pretty(e.param) || e.location || "body",
          message:
            e.msg && e.msg !== "Invalid value"
              ? e.msg
              : `Invalid value provided${
                  typeof e.value !== "undefined"
                    ? `: ${JSON.stringify(e.value)}`
                    : ""
                }`,
          value: e.value,
        })),
      });
    }

    try {
      const data = req.body;

      const createdUser = await authService.signup(data);
      return res.status(201).json({
        success: true,
        message:
          "Signup successful. Please Verify your email and phone number to login.",
      });
    } catch (error: any) {
      const message = error?.message || "Signup failed";
      return res.status(400).json({ success: false, message });
    }
  }

  static async sendEmailOtp(req: Request, res: Response) {
    const { email, type } = req.body;

    try {
      if (!email) {
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });
      }
      if (type !== "signup" && type !== "forgot-password") {
        return res.status(400).json({
          success: false,
          message: "Type must be either 'signup' or 'forgot-password'",
        });
      }

      const resendCount = await getResendCount(email, type);
      if (resendCount >= OTP_RESEND_LIMIT) {
        return res.status(429).json({
          success: false,
          message: "OTP limit reached for today. Try again tomorrow.",
        });
      }

      await incrementResend(email, type);
      const otp = generateOtp(6);

      await setRedisOtp(email, otp, type);

      await sendOtpEmail(email, otp, type);

      return res.status(201).json({
        success: true,
        message: "OTP sent successfully.",
      });
    } catch (error) {
      const message = (error as any)?.message || "Failed to send OTP";
      return res.status(500).json({ success: false, message });
    }
  }

  static async verifySignupOtp(req: Request, res: Response) {
    const { email, otp, type } = req.body;

    try {
      if (type === "signup") {
        const message = await authService.verifySignupOtp(email, otp);
        return res.status(200).json({ success: true, message });
      } else if (type === "forgot-password") {
        const message = await authService.verifyForgotPasswordOtp(email, otp);
        return res.status(200).json({ success: true, message });
      }
    } catch (error) {
      const message = (error as any)?.message || "OTP verification failed";
      return res.status(400).json({ success: false, message });
    }
  }

  static async forgotPasswordRequest(req: Request, res: Response) {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const resendCount = await getResendCount(email, "forgot-password");

    if (resendCount >= OTP_RESEND_LIMIT) {
      return res.status(429).json({
        success: false,
        message: "Resend OTP limit reached for today. Try again tomorrow.",
      });
    }
    await incrementResend(email, "forgot-password");

    const otp = generateOtp(6);

    await setRedisOtp(email, otp, "forgot-password");
    await sendOtpEmail(user.email, otp, "forgot-password");

    return res
      .status(200)
      .json({ success: true, message: "OTP sent to email for password reset" });
  }

  static async resetPassword(req: Request, res: Response) {
    const token = req.params.token;
    const { newPassword } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET environment variable is required",
      });
    }

    const decodedTokenValue = jwt.verify(token, secret) as {
      id: string;
      hash: string;
      iat: number;
      exp: number;
    };

    const user = await User.findById(decodedTokenValue.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New password is required" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await redisClient.del(`forgot-password-token:${user.email}`);

    return res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  }
}
