import { User, IUser } from "../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getOtp,
  incrementAttempt,
  OTP_ATTEMPT_LIMIT,
  setOtp,
} from "../../lib/otpRedis";
import { redisClient } from "../../lib/redis";
import { sendResetPasswordEmail } from "../../lib/email";

export class AuthService {
  async loginWithEmail(email: string, password: string) {
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const user = await User.findOne({
        email: email.toLowerCase(),
        isActive: true,
        isEmailLoginEnabled: true,
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.isEmailVerified) {
        throw new Error("Please verify your email before logging in.");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET environment variable is required");
      }

      const token = jwt.sign({ id: user._id, email: user.email }, secret, {
        expiresIn: "7d",
      });

      return { user, token };
    } catch (error: any) {
      const message = error?.message || "Authentication failed";
      throw new Error(message);
    }
  }

  async loginWithPhone(phoneNumber: string, password: string) {
    try {
      if (!phoneNumber || !password) {
        throw new Error("Phone number and password are required");
      }
      const user = await User.findOne({
        phoneNumber: phoneNumber,
        isActive: true,
        isMobileLoginEnabled: true,
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.isPhoneVerified) {
        throw new Error("Please verify your phone number before logging in.");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET environment variable is required");
      }

      const token = jwt.sign(
        { id: user._id, phoneNumber: user.phoneNumber },
        secret,
        {
          expiresIn: "7d",
        }
      );

      return { user, token };
    } catch (error: any) {
      const message = error?.message || "Authentication failed";
      throw new Error(message);
    }
  }

  async signup(
    data: Partial<IUser> & {
      password: string;
      email: string;
      phoneNumber: string;
    }
  ) {
    try {
      const email = data.email ? data.email.toLowerCase().trim() : undefined;
      const phoneNumber = data.phoneNumber
        ? data.phoneNumber.toString().trim()
        : undefined;

      const [byEmail, byPhone] = await Promise.all([
        email ? User.findOne({ email }) : Promise.resolve(null),
        phoneNumber ? User.findOne({ phoneNumber }) : Promise.resolve(null),
      ]);
      if (byEmail) {
        throw new Error("Email already in use");
      }

      if (byPhone) {
        throw new Error("Phone number already in use");
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const newUser = new User({
        ...(data as any),
        email,
        phoneNumber,
        password: hashedPassword,
      });

      await newUser.save();

      return newUser.toObject ? newUser.toObject() : newUser;
    } catch (error) {
      const message = (error as any)?.message || "Signup failed";
      throw new Error(message);
    }
  }

  async verifyForgotPasswordOtp(email: string, otp: string) {
    if (!email || !otp) {
      throw new Error("Email and OTP are required");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new Error("User not found");
    }

    const attemptCount = await incrementAttempt(email, "forgot-password");
    if (attemptCount > OTP_ATTEMPT_LIMIT) {
      throw new Error(
        "Maximum OTP attempts reached for today. Try again tomorrow."
      );
    }

    const redisOtp = await getOtp(email, "forgot-password");

    if (!redisOtp || redisOtp !== otp) {
      throw new Error("Invalid or expired OTP");
    }

    const randomHash = await bcrypt.hash(
      Math.random().toString(36).substring(2),
      10
    );

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    const token = jwt.sign({ id: user._id, hash: randomHash }, secret, {
      expiresIn: "5m",
    });

    await redisClient.set(`forgot-password-token:${email}`, token, { EX: 300 });
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendResetPasswordEmail(email, url);

    user.isEmailVerified = true;
    await user.save();

    return "Email verified successfully";
  }

  async verifySignupOtp(email: string, otp: string) {
    if (!email) {
      throw new Error("Email is required");
    }

    if (!otp) {
      throw new Error("OTP is required");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new Error("User not found");
    }

    const attemptCount = await incrementAttempt(email, "signup");

    if (attemptCount > OTP_ATTEMPT_LIMIT) {
      throw new Error(
        "Maximum OTP attempts reached for today. Try again tomorrow."
      );
    }

    const redisOtp = await getOtp(email, "signup");

    if (redisOtp !== otp) {
      throw new Error("Invalid OTP");
    }

    if (!redisOtp) {
      throw new Error("OTP has expired. Please request a new one.");
    }

    if (user.isEmailVerified) {
      throw new Error("Email is already verified");
    }

    user.isEmailVerified = true;

    await user.save();

    return "Email verified successfully";
  }
}
