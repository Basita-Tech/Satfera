import { User, IUser, Profile } from "../../models";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request } from "express";
import {
  logger,
  parseDDMMYYYYToDate,
  redisClient,
  sendOtpEmail,
  sendResetPasswordEmail
} from "../../lib";
import { generateCustomId } from "../../lib";
import {
  getOtp,
  incrementAttempt,
  OTP_ATTEMPT_LIMIT,
  setOtp
} from "../../lib/redis/otpRedis";
import { enqueueWelcomeEmail } from "../../lib/queue/enqueue";
import {
  TimingSafeAuth,
  generateJTI,
  constantTimeUserLookup,
  constantTimePasswordValidation,
  generateSecureOTP,
  verifyOTPConstantTime
} from "../../utils/timingSafe";
import { SessionService } from "../sessionService";
import { generateDeviceFingerprint } from "../../utils/secureToken";
import { getClientIp } from "../../utils/ipUtils";

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

    const enqueued = await enqueueWelcomeEmail(
      user._id,
      {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username
      },
      loginLink
    );

    if (enqueued) {
      user.welcomeSent = true;
      await user.save();
      logger.info(`Welcome email queued for ${user.email}`);
      return true;
    } else {
      logger.error(`Failed to queue welcome email for ${user.email}`);
      return false;
    }
  } catch (error: any) {
    logger.error(
      `Failed to queue welcome email for ${user.email}:`,
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

  async loginWithEmail(
    email: string,
    password: string,
    req: Request
  ): Promise<{ user: IUser; token: string; isNewSession: boolean }> {
    const timingSafe = new TimingSafeAuth(250);

    if (!email || !password) {
      return await timingSafe.fail(
        new Error("Email and password are required")
      );
    }

    const user = await constantTimeUserLookup<IUser>(
      () =>
        User.findOne({
          email: email.toLowerCase(),
          isActive: true,
          isEmailLoginEnabled: true,
          isDeleted: false
        }),
      100
    );

    if (!user) {
      return await timingSafe.fail(new Error("Invalid credentials"));
    }

    if (!user.isEmailVerified) {
      return await timingSafe.fail(
        new Error("Please verify your email before logging in.")
      );
    }

    const isPasswordValid = await constantTimePasswordValidation(
      async () => await bcrypt.compare(password, user.password),
      150
    );

    if (!isPasswordValid) {
      return await timingSafe.fail(new Error("Invalid credentials"));
    }

    const userId = String(user._id);
    const ipAddress = getClientIp(req);

    const existingSession = await SessionService.findExistingSession(
      userId,
      req,
      ipAddress
    );

    let token: string;
    let isNewSession: boolean;

    if (existingSession) {
      token = existingSession.token;
      isNewSession = false;

      await SessionService.updateSessionActivity(String(existingSession._id));

      logger.info(
        `Reusing existing session for user ${userId} on ${ipAddress}`
      );
    } else {
      const jti = generateJTI();
      token = jwt.sign(
        {
          id: userId,
          email: user.email,
          jti,
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret(),
        {
          expiresIn: "1d"
        }
      );

      const fingerprint = generateDeviceFingerprint(
        req.get("user-agent") || "",
        ipAddress
      );

      await SessionService.createSession(
        userId,
        token,
        jti,
        req,
        ipAddress,
        86400,
        fingerprint
      );
      isNewSession = true;
    }

    user.lastLoginAt = new Date();
    await user.save();

    return await timingSafe.complete({ user, token, isNewSession });
  }

  async loginWithPhone(
    phoneNumber: string,
    password: string,
    req: Request
  ): Promise<{ user: IUser; token: string; isNewSession: boolean }> {
    const timingSafe = new TimingSafeAuth(250);

    if (!phoneNumber || !password) {
      return await timingSafe.fail(
        new Error("Phone number and password are required")
      );
    }

    const user = await constantTimeUserLookup<IUser>(
      () =>
        User.findOne({
          phoneNumber: phoneNumber,
          isActive: true,
          isMobileLoginEnabled: true,
          isDeleted: false
        }),
      100
    );

    if (!user) {
      return await timingSafe.fail(new Error("Invalid credentials"));
    }

    const isPasswordValid = await constantTimePasswordValidation(
      async () => await bcrypt.compare(password, user.password),
      150
    );

    if (!isPasswordValid) {
      return await timingSafe.fail(new Error("Invalid credentials"));
    }

    const userId = String(user._id);
    const ipAddress = getClientIp(req);

    const existingSession = await SessionService.findExistingSession(
      userId,
      req,
      ipAddress
    );

    let token: string;
    let isNewSession: boolean;

    if (existingSession) {
      token = existingSession.token;
      isNewSession = false;

      await SessionService.updateSessionActivity(String(existingSession._id));

      logger.info(
        `Reusing existing session for user ${userId} on ${ipAddress}`
      );
    } else {
      const jti = generateJTI();
      token = jwt.sign(
        {
          id: userId,
          phoneNumber: user.phoneNumber,
          jti,
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret(),
        {
          expiresIn: "1d"
        }
      );

      const fingerprint = generateDeviceFingerprint(
        req.get("user-agent") || "",
        ipAddress
      );

      await SessionService.createSession(
        userId,
        token,
        jti,
        req,
        ipAddress,
        86400,
        fingerprint
      );
      isNewSession = true;
    }

    user.lastLoginAt = new Date();
    await user.save();

    return await timingSafe.complete({ user, token, isNewSession });
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

    if (!data.termsAndConditionsAccepted) {
      throw new Error("You must accept the terms and conditions");
    }

    const [byEmail, byPhone] = await Promise.all([
      email ? User.findOne({ email, isDeleted: false }) : Promise.resolve(null),
      phoneNumber
        ? User.findOne({ phoneNumber, isDeleted: false })
        : Promise.resolve(null)
    ]);

    if (byEmail) throw new Error("Email already in use");
    if (byPhone) throw new Error("Phone number already in use");

    const dob = parseDDMMYYYYToDate((data as any).dateOfBirth as string);
    if (dob) (data as any).dateOfBirth = dob;

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const customId = await generateCustomId((data as any).gender);

    const newUser = new User({
      ...(data as any),
      email,
      phoneNumber,
      password: hashedPassword,
      customId
    });

    const userProfile = await Profile.create({
      userId: newUser._id
    });

    if (!userProfile) {
      throw new Error("Failed to create user profile");
    }

    await newUser.save();

    await sendWelcomeEmailOnce(newUser);

    return newUser.toObject ? newUser.toObject() : newUser;
  }

  async generateAndStoreOtp(email: string, type: "signup" | "forgot-password") {
    const otp = generateSecureOTP(6);

    await setOtp(email, otp, type);

    await sendOtpEmail(email, otp, type);
    return otp;
  }

  async verifyForgotPasswordOtp(
    email: string,
    otp: string
  ): Promise<{ message: string; tokenSent: boolean }> {
    const timingSafe = new TimingSafeAuth(200);

    if (!email || !otp) {
      return await timingSafe.fail(new Error("Email and OTP are required"));
    }

    const user = await constantTimeUserLookup<IUser>(
      () =>
        User.findOne({
          email: email.toLowerCase().trim(),
          isDeleted: false
        }),
      100
    );

    if (!user) {
      return await timingSafe.fail(new Error("User not found"));
    }

    const attemptCount = await incrementAttempt(email, "forgot-password");
    if (attemptCount > OTP_ATTEMPT_LIMIT) {
      return await timingSafe.fail(
        new Error(
          `Maximum OTP verification attempts (${OTP_ATTEMPT_LIMIT}) reached. Please request a new OTP or try again after 24 hours.`
        )
      );
    }

    const redisOtp = await getOtp(email, "forgot-password");
    if (!redisOtp) {
      return await timingSafe.fail(
        new Error(
          "OTP has expired. OTPs are valid for 5 minutes. Please request a new one."
        )
      );
    }

    const isValid = await verifyOTPConstantTime(otp, redisOtp);
    if (!isValid) {
      const remainingAttempts = OTP_ATTEMPT_LIMIT - attemptCount;
      return await timingSafe.fail(
        new Error(
          `Invalid OTP. You have ${remainingAttempts} attempt${
            remainingAttempts !== 1 ? "s" : ""
          } remaining.`
        )
      );
    }

    const jti = generateJTI();
    const token = jwt.sign(
      {
        id: String(user._id),
        email: user.email,
        jti,
        purpose: "password-reset"
      },
      this.jwtSecret(),
      {
        expiresIn: "5m"
      }
    );

    await redisClient.setEx(
      `forgot-password-token:${String(user._id)}`,
      300,
      token
    );

    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendResetPasswordEmail(user.email, url);

    return await timingSafe.complete({
      message: "Password reset link sent to email",
      tokenSent: true
    });
  }

  async verifySignupOtp(
    email: string,
    otp: string
  ): Promise<{ token: string; user: IUser; message: string }> {
    const timingSafe = new TimingSafeAuth(200);

    if (!email) {
      return await timingSafe.fail(new Error("Email is required"));
    }
    if (!otp) {
      return await timingSafe.fail(new Error("OTP is required"));
    }

    const user = await constantTimeUserLookup<IUser>(
      () =>
        User.findOne({
          email: email.toLowerCase().trim(),
          isDeleted: false
        }),
      100
    );

    if (!user) {
      return await timingSafe.fail(new Error("User not found"));
    }

    const attemptCount = await incrementAttempt(email, "signup");
    if (attemptCount > OTP_ATTEMPT_LIMIT) {
      return await timingSafe.fail(
        new Error(
          `Maximum OTP verification attempts (${OTP_ATTEMPT_LIMIT}) reached. Please request a new OTP or try again after 24 hours.`
        )
      );
    }

    const redisOtp = await getOtp(email, "signup");
    if (!redisOtp) {
      return await timingSafe.fail(
        new Error(
          "OTP has expired. OTPs are valid for 5 minutes. Please request a new one."
        )
      );
    }

    const isValid = await verifyOTPConstantTime(otp, redisOtp);
    if (!isValid) {
      const remainingAttempts = OTP_ATTEMPT_LIMIT - attemptCount;
      return await timingSafe.fail(
        new Error(
          `Invalid OTP. You have ${remainingAttempts} attempt${
            remainingAttempts !== 1 ? "s" : ""
          } remaining.`
        )
      );
    }

    if (user.isEmailVerified) {
      return await timingSafe.fail(new Error("Email is already verified"));
    }

    user.isEmailVerified = true;
    await user.save();

    const jti = generateJTI();
    const token = jwt.sign(
      { id: String(user._id), jti, iat: Math.floor(Date.now() / 1000) },
      this.jwtSecret(),
      {
        expiresIn: "1d"
      }
    );

    await sendWelcomeEmailOnce(user);

    return await timingSafe.complete({
      token,
      user,
      message: user.isPhoneVerified
        ? "Email verified successfully. You can now login."
        : "Email verified successfully. You can now login."
    });
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    const timingSafe = new TimingSafeAuth(200);

    if (!token || !newPassword) {
      return await timingSafe.fail(
        new Error("Token and newPassword are required")
      );
    }

    let payload: any;
    try {
      payload = jwt.verify(token, this.jwtSecret()) as any;
    } catch (err) {
      return await timingSafe.fail(new Error("Invalid or expired token"));
    }

    const userId = payload.id;
    if (!userId) {
      return await timingSafe.fail(new Error("Invalid token payload"));
    }

    const stored = await redisClient.get(`forgot-password-token:${userId}`);
    if (!stored || stored !== token) {
      return await timingSafe.fail(new Error("Token not found or expired"));
    }

    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      return await timingSafe.fail(new Error("User not found"));
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await SessionService.logoutAllSessions(userId);

    await redisClient.del(`forgot-password-token:${userId}`);

    return await timingSafe.complete({ message: "Password reset successful" });
  }
}
