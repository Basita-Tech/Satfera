import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { LoginRequest } from "../types/types";
import { AuthService } from "../services/authServices";

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
              : `Invalid value provided${typeof e.value !== "undefined" ? `: ${JSON.stringify(e.value)}` : ""}`,
          value: e.value,
        })),
      });
    }

    const { email, phoneNumber, password }: LoginRequest = req.body;

    try {
      if (!password || (!email && !phoneNumber)) {
        return res
          .status(400)
          .json({ message: "Email or phone number and password are required" });
      }

      if (email && password) {
        const result = await authService.loginWithEmail(email, password);

        if (!result) {
          return res.status(401).json({ message: "Invalid credentials" });
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

        req.cookies = {
          token: result.token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: "strict",
        };

        return res.status(200).json({ user: publicUser, token: result.token });
      }

      if (phoneNumber && password) {
        const result = await authService.loginWithPhone(phoneNumber, password);
        if (!result) {
          return res.status(401).json({ message: "Invalid credentials" });
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

        req.cookies = {
          token: result.token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        };
        return res.status(200).json({ user: publicUser, token: result.token });
      }
    } catch (error) {
      const message = (error as Error)?.message || "Login failed";
      return res.status(500).json({ message });
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
              : `Invalid value provided${typeof e.value !== "undefined" ? `: ${JSON.stringify(e.value)}` : ""}`,
          value: e.value,
        })),
      });
    }

    try {
      const data = req.body;
      const createdUser = await authService.signup(data);

      const token = jwt.sign(
        {
          id: (createdUser as any).id || (createdUser as any)._id,
          email: (createdUser as any).email,
        },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res
        .status(201)
        .json({ message: "Signup successful", user: createdUser, token });
    } catch (error: any) {
      const message = error?.message || "Signup failed";
      return res.status(400).json({ message });
    }
  }
}
