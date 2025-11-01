import { User, IUser } from "../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getOtp,
  incrementAttempt,
  OTP_ATTEMPT_LIMIT,
  setOtp,
} from "../../lib/otpRedis";
import { redisClient } from "../..//lib/redis";
import {
  sendResetPasswordEmail,
  sendOtpEmail,
  sendWelcomeEmail,
} from "../../lib/email";
import { parseDDMMYYYYToDate } from "../../lib/lib";

async function sendWelcomeEmailOnce(user: any): Promise<boolean> {
  try {
    if (!user.isEmailVerified || user.welcomeSent) {
      return false;
    }

    const username = user.email || user.phoneNumber || "";
    const loginLink = `${process.env.FRONTEND_URL || ""}/login`;
    const fullName = `${(user as any).firstName || "User"} ${
      (user as any).lastName || ""
    }`.trim();

    await sendWelcomeEmail(
      user.email,
      fullName,
      username,
      loginLink,
      process.env.SUPPORT_CONTACT
    );

    user.welcomeSent = true;
    await user.save();

    console.log(`Welcome email sent to ${user.email}`);
    return true;
  } catch (error: any) {
    console.error(
      `Failed to send welcome email to ${user.email}:`,
      error.message || error
    );

    return false;
  }
}

export class AuthService {
  private jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    if (secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters long");
    }
    return secret;
  }

  async loginWithEmail(email: string, password: string) {
    if (!email || !password) throw new Error("Email and password are required");

    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
      isEmailLoginEnabled: true,
    });

    if (!user) throw new Error("Invalid credentials");

    if (!user.isEmailVerified)
      throw new Error("Please verify your email before logging in.");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error("Invalid credentials");

    const token = jwt.sign(
      { id: user._id, email: user.email },
      this.jwtSecret(),
      {
        expiresIn: "7d",
      }
    );

    return { user, token };
  }

  async loginWithPhone(phoneNumber: string, password: string) {
    if (!phoneNumber || !password)
      throw new Error("Phone number and password are required");

    const user = await User.findOne({
      phoneNumber: phoneNumber,
      isActive: true,
      isMobileLoginEnabled: true,
    });

    if (!user) throw new Error("Invalid credentials");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error("Invalid credentials");

    const token = jwt.sign(
      { id: user._id, phoneNumber: user.phoneNumber },
      this.jwtSecret(),
      {
        expiresIn: "7d",
      }
    );

    return { user, token };
  }

  async signup(
    data: Partial<IUser> & {
      password: string;
      email: string;
      phoneNumber: string;
    }
  ) {
    const email = data.email ? data.email.toLowerCase().trim() : undefined;
    const phoneNumber = data.phoneNumber
      ? data.phoneNumber.toString().trim()
      : undefined;

    const [byEmail, byPhone] = await Promise.all([
      email ? User.findOne({ email }) : Promise.resolve(null),
      phoneNumber ? User.findOne({ phoneNumber }) : Promise.resolve(null),
    ]);

    if (byEmail) throw new Error("Email already in use");
    if (byPhone) throw new Error("Phone number already in use");

    const dob = parseDDMMYYYYToDate((data as any).dateOfBirth as string);
    if (dob) (data as any).dateOfBirth = dob;

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = new User({
      ...(data as any),
      email,
      phoneNumber,
      password: hashedPassword,
    });

    await newUser.save();

    await sendWelcomeEmailOnce(newUser);

    return newUser.toObject ? newUser.toObject() : newUser;
  }

  async generateAndStoreOtp(email: string, type: "signup" | "forgot-password") {
    const otp =
      Math.random()
        .toString()
        .slice(2, 2 + 6) ||
      Math.floor(100000 + Math.random() * 900000).toString();

    await setOtp(email, otp, type);

    await sendOtpEmail(email, otp, type);
    return otp;
  }

  async verifyForgotPasswordOtp(email: string, otp: string) {
    if (!email || !otp) throw new Error("Email and OTP are required");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) throw new Error("User not found");

    const attemptCount = await incrementAttempt(email, "forgot-password");
    if (attemptCount > OTP_ATTEMPT_LIMIT) {
      throw new Error(
        `Maximum OTP verification attempts (${OTP_ATTEMPT_LIMIT}) reached. Please request a new OTP or try again after 24 hours.`
      );
    }

    const redisOtp = await getOtp(email, "forgot-password");
    if (!redisOtp) {
      throw new Error(
        "OTP has expired. OTPs are valid for 5 minutes. Please request a new one."
      );
    }
    if (redisOtp !== otp) {
      const remainingAttempts = OTP_ATTEMPT_LIMIT - attemptCount;
      throw new Error(
        `Invalid OTP. You have ${remainingAttempts} attempt${
          remainingAttempts !== 1 ? "s" : ""
        } remaining.`
      );
    }

    const randomHash = await bcrypt.hash(
      Math.random().toString(36).substring(2),
      10
    );
    const token = jwt.sign(
      { id: user._id, email: user.email, hash: randomHash },
      this.jwtSecret(),
      {
        expiresIn: "5m",
      }
    );

    await redisClient.set(
      `forgot-password-token:${user.id.toString()}`,
      token,
      { EX: 300 }
    );

    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendResetPasswordEmail(user.email, url);

    return { message: "Password reset link sent to email", tokenSent: true };
  }

  async verifySignupOtp(email: string, otp: string) {
    if (!email) throw new Error("Email is required");
    if (!otp) throw new Error("OTP is required");

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) throw new Error("User not found");

    const attemptCount = await incrementAttempt(email, "signup");
    if (attemptCount > OTP_ATTEMPT_LIMIT) {
      throw new Error(
        `Maximum OTP verification attempts (${OTP_ATTEMPT_LIMIT}) reached. Please request a new OTP or try again after 24 hours.`
      );
    }

    const redisOtp = await getOtp(email, "signup");
    if (!redisOtp) {
      throw new Error(
        "OTP has expired. OTPs are valid for 5 minutes. Please request a new one."
      );
    }
    if (redisOtp !== otp) {
      const remainingAttempts = OTP_ATTEMPT_LIMIT - attemptCount;
      throw new Error(
        `Invalid OTP. You have ${remainingAttempts} attempt${
          remainingAttempts !== 1 ? "s" : ""
        } remaining.`
      );
    }

    if (user.isEmailVerified) throw new Error("Email is already verified");

    user.isEmailVerified = true;
    await user.save();

    const token = jwt.sign({ id: user._id }, this.jwtSecret(), {
      expiresIn: "7d",
    });

    await sendWelcomeEmailOnce(user);

    return {
      token,
      user,
      message: user.isPhoneVerified
        ? "Email verified successfully. You can now login."
        : "Email verified successfully. You can now login.",
    };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    if (!token || !newPassword)
      throw new Error("Token and newPassword are required");

    let payload: any;
    try {
      payload = jwt.verify(token, this.jwtSecret()) as any;
    } catch (err) {
      throw new Error("Invalid or expired token");
    }

    const userId = payload.id;
    if (!userId) throw new Error("Invalid token payload");

    const stored = await redisClient.get(`forgot-password-token:${userId}`);
    if (!stored || stored !== token)
      throw new Error("Token not found or expired");

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await redisClient.del(`forgot-password-token:${userId}`);
    return { message: "Password reset successful" };
  }
}
