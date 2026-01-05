import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { validationResult } from "express-validator";
import { AuthenticatedRequest, LoginRequest } from "../../types";
import { AuthService } from "../../services";
import jwt from "jsonwebtoken";
import {
  incrementResend,
  getResendCount,
  OTP_RESEND_LIMIT
} from "../../lib/redis/otpRedis";
import { User, Profile } from "../../models";
import { redisClient } from "../../lib/redis";
import { env } from "../../config";
import { APP_CONFIG } from "../../utils/constants";
import { sanitizeError } from "../../middleware/securityMiddleware";
import { logger } from "../../lib/common/logger";
import {
  setSecureTokenCookie,
  generateCSRFToken,
  setCSRFTokenCookie,
  clearAuthCookies,
  verifyDeviceFingerprint,
  generateDeviceFingerprint
} from "../../utils/secureToken";
import { SessionService } from "../../services/sessionService";
import { getClientIp, normalizeIp } from "../../utils/ipUtils";
import { generateJTI } from "../../utils/timingSafe";

const authService = new AuthService();

const COOKIE_MAX_AGE = APP_CONFIG.COOKIE_MAX_AGE;

function formatValidationErrors(req: Request) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  const pretty = (param: string | undefined) => {
    if (!param) return "body";
    const map: Record<string, string> = {
      dateOfBirth: "date Of Birth",
      timeOfBirth: "time Of Birth",
      full_address: "full address",
      userId: "User ID"
    };
    return map[param] || param;
  };
  return errors.array().map((e: any) => ({
    field: pretty(e.param) || e.location || "body",
    message:
      e.msg && e.msg !== "Invalid value"
        ? e.msg
        : `Invalid value provided${
            typeof e.value !== "undefined" ? `: ${JSON.stringify(e.value)}` : ""
          }`,
    value: e.value
  }));
}

function sanitizeUser(user: any) {
  const {
    password,
    __v,
    createdAt,
    updatedAt,
    isEmailLoginEnabled,
    isMobileLoginEnabled,
    ...rest
  } = user;
  return rest;
}
const client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

export class AuthController {
  static async startGoogleAuth(req: Request, res: Response) {
    const redirectUri = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid"
      ]
    });
    res.redirect(redirectUri);
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      const { idToken } = req.body;
      const isMobile = req.body.platform === "mobile" || !!idToken;

      let googleUser: any;
      let email: string;
      let emailVerified: boolean;
      let givenName: string;
      let picture: string;

      if (isMobile && idToken) {
        try {
          const ticket = await client.verifyIdToken({
            idToken,
            audience: [
              env.GOOGLE_CLIENT_ID,
              env.GOOGLE_ANDROID_CLIENT_ID,
              env.GOOGLE_IOS_CLIENT_ID
            ].filter(Boolean)
          });

          const payload = ticket.getPayload();
          if (!payload) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid Google token" });
          }

          email = (payload.email || "").toLowerCase();
          emailVerified = payload.email_verified || false;
          givenName = payload.given_name || "";
          picture = payload.picture || "";
        } catch (verifyError: any) {
          logger.error("Google idToken verification failed", {
            error: verifyError.message
          });
          return res.status(401).json({
            success: false,
            message: "Invalid or expired Google token"
          });
        }
      } else if (code) {
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
          }
        );
        googleUser = await userInfoResponse.json();

        email = (googleUser?.email || "").toLowerCase();
        emailVerified = googleUser?.email_verified;
        givenName = googleUser?.given_name;
        picture = googleUser?.picture;
      } else {
        return res.status(400).json({
          success: false,
          message: "Missing code parameter or idToken"
        });
      }

      const user = await User.findOne({
        email,
        isActive: true,
        isDeleted: false
      });

      if (!user) {
        if (isMobile) {
          return res.status(404).json({
            success: false,
            message: "User not found. Please sign up first.",
            data: {
              email,
              name: givenName,
              picture
            }
          });
        }

        const frontendLoginNoUser = `${
          process.env.FRONTEND_URL
        }/login?googleExists=false&email=${encodeURIComponent(
          email
        )}&name=${encodeURIComponent(
          givenName || ""
        )}&picture=${encodeURIComponent(picture || "")}`;
        return res.redirect(frontendLoginNoUser);
      }

      if (!user.isEmailVerified && emailVerified) {
        user.isEmailVerified = true;
        await user.save();
      }

      // Use existing session management logic
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
        logger.info(`Reusing existing session for Google OAuth user ${userId}`);
      } else {
        const jti = generateJTI();
        token = jwt.sign(
          {
            id: userId,
            email: user.email,
            jti,
            iat: Math.floor(Date.now() / 1000)
          },
          process.env.JWT_SECRET as string,
          { expiresIn: "30d" }
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
          APP_CONFIG.COOKIE_MAX_AGE,
          fingerprint
        );
        isNewSession = true;
      }

      user.lastLoginAt = new Date();
      await user.save();

      const publicUser = sanitizeUser(user.toObject());

      const isOnboardingCompleted =
        typeof publicUser.isOnboardingCompleted !== "undefined"
          ? publicUser.isOnboardingCompleted
          : (publicUser as any).isOnBordingCompleted;

      let redirectTo = "/dashboard";
      const profile = await Profile.findOne({ userId: user._id });

      if (!isOnboardingCompleted) {
        redirectTo = "/onboarding/user";
      } else if (profile && profile.isVerified === false) {
        redirectTo = "/onboarding/review";
      }

      // Mobile response
      if (isMobile) {
        logger.info("Google OAuth mobile login successful", {
          userId,
          email,
          isNewSession
        });

        return res.status(200).json({
          success: true,
          message: "Login successful",
          token,
          user: publicUser,
          isNewSession,
          redirectTo
        });
      }

      // Web response (with cookies and redirect)
      setSecureTokenCookie(res, token, { maxAge: APP_CONFIG.COOKIE_MAX_AGE });

      const csrfToken = generateCSRFToken();
      setCSRFTokenCookie(res, csrfToken);

      const frontendLoginUrl = `${
        process.env.FRONTEND_URL
      }/login?token=${token}&redirectTo=${encodeURIComponent(redirectTo)}`;

      logger.info("Google OAuth web login successful", {
        userId,
        email,
        isNewSession
      });

      return res.redirect(frontendLoginUrl);
    } catch (error: any) {
      logger.error("Google OAuth error:", {
        error: error.message,
        stack: error.stack
      });

      if (req.body.platform === "mobile" || req.body.idToken) {
        return res.status(500).json({
          success: false,
          message: "Authentication failed"
        });
      }

      res.status(500).send("Authentication failed");
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const validation = formatValidationErrors(req);
      if (validation) {
        return res.status(400).json({ success: false, errors: validation });
      }

      const { email, phoneNumber, password }: LoginRequest = req.body;

      if (!password || (!email && !phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: "Email or phone number and password are required"
        });
      }

      let result;
      try {
        if (email) {
          result = await authService.loginWithEmail(email, password, req);
        } else {
          result = await authService.loginWithPhone(
            phoneNumber!,
            password,
            req
          );
        }
      } catch (authError: any) {
        logger.warn(
          `Login failed. Email/Phone: ${email || phoneNumber}, IP: ${req.ip}, User Agent: ${req.get("user-agent")}, Reason: ${authError.message}`
        );

        const statusCode = authError.status || 401;
        const responseBody: any = {
          success: false,
          message: authError.message
        };

        if (authError.reason) {
          responseBody.reason = authError.reason;
        }

        return res.status(statusCode).json(responseBody);
      }

      const userObj = result.user.toObject
        ? result.user.toObject()
        : result.user;
      const publicUser = sanitizeUser(userObj) as any;

      const completedSteps = Array.isArray(publicUser?.completedSteps)
        ? publicUser.completedSteps
        : [];

      setSecureTokenCookie(res, result.token, { maxAge: COOKIE_MAX_AGE });

      const csrfToken = generateCSRFToken();
      setCSRFTokenCookie(res, csrfToken);

      const isOnboardingCompleted =
        typeof publicUser.isOnboardingCompleted !== "undefined"
          ? publicUser.isOnboardingCompleted
          : publicUser.isOnBordingCompleted;

      if (!isOnboardingCompleted) {
        return res.status(200).json({
          success: false,
          message: "Onboarding is not completed",
          redirectTo: `/onboarding/user`,
          user: publicUser
        });
      }

      const profile = await Profile.findOne({ userId: result.user._id });

      if (profile && profile.isVerified === false) {
        return res.status(200).json({
          success: false,
          message: "Profile is not verified",
          redirectTo: `/onboarding/review`,
          user: publicUser
        });
      }

      logger.info("Successful login", {
        userId: publicUser.id,
        email: email || phoneNumber,
        ip: req.ip,
        isNewSession: result.isNewSession
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: publicUser,
        token: result.token,
        isNewSession: result.isNewSession,
        redirectTo: "/dashboard"
      });
    } catch (err: any) {
      logger.error("Login error", {
        error: err.message,
        stack: err.stack,
        ip: req.ip
      });

      if (err.message && err.message !== "An error occurred") {
        return res.status(err.status || 401).json({
          success: false,
          message: err.message
        });
      }

      const sanitized = sanitizeError(err);
      return res.status(sanitized.status).json({
        success: false,
        message: sanitized.message
      });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.cookies?.token;
      const csrfCookie = req.cookies?.csrf_token;
      // const csrfHeader =
      //   (req.headers["x-csrf-token"] as string) ||
      //   (req.headers["csrf-token"] as string);

      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      let decoded: any = null;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      } catch (jwtErr) {
        logger.warn("Invalid JWT on /auth/me", {
          error: (jwtErr as any).message,
          ip: req.ip
        });
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      const userId = decoded?.id || decoded?.userId || decoded?.sub;
      const jti = decoded?.jti;

      if (!userId || !jti) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      const session = await SessionService.validateSession(String(userId), jti);
      if (!session) {
        logger.warn("Unauthorized access", {
          userId,
          jti,
          ip: req.ip
        });
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      const userRecord =
        req.user || (await User.findById(userId).select("-password -__v"));
      if (!userRecord) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated" });
      }

      const userObj = (userRecord as any).toObject
        ? (userRecord as any).toObject()
        : userRecord;
      const publicUser = sanitizeUser(userObj);

      return res.status(200).json({ success: true, user: publicUser });
    } catch (err: any) {
      logger.error("Me endpoint error", { error: err?.message, ip: req.ip });
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async signup(req: Request, res: Response) {
    try {
      const validation = formatValidationErrors(req);
      if (validation) {
        return res.status(400).json({ success: false, errors: validation });
      }

      const data = req.body;
      await authService.signup(data);

      return res.status(201).json({
        success: true,
        message:
          "Signup successful. Please verify your email and phone number to login."
      });
    } catch (err: any) {
      const message = (err as any)?.message || "Signup failed";
      return res.status(400).json({ success: false, message });
    }
  }

  static async sendEmailOtp(req: Request, res: Response) {
    try {
      const { email, type } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });
      if (type !== "signup" && type !== "forgot-password") {
        return res.status(400).json({
          success: false,
          message: "Type must be either 'signup' or 'forgot-password'"
        });
      }

      const resendCount = await getResendCount(email, type);
      if (resendCount >= OTP_RESEND_LIMIT) {
        return res.status(429).json({
          success: false,
          message: "OTP resend limit reached for today. Try again tomorrow."
        });
      }

      await incrementResend(email, type);
      const otp = await authService.generateAndStoreOtp(email, type);

      return res
        .status(201)
        .json({ success: true, message: "OTP sent successfully.", otp });
    } catch (err: any) {
      const message = (err as any)?.message || "Failed to send OTP";
      return res.status(500).json({ success: false, message });
    }
  }

  static async verifySignupOtp(req: Request, res: Response) {
    try {
      const { email, otp, type } = req.body;
      if (!type || (type !== "signup" && type !== "forgot-password")) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid type" });
      }
      if (!email || !otp) {
        return res
          .status(400)
          .json({ success: false, message: "Email and OTP are required" });
      }

      if (type === "signup") {
        const response = await authService.verifySignupOtp(email, otp, req);

        setSecureTokenCookie(res, response.token, { maxAge: COOKIE_MAX_AGE });

        const csrfToken = generateCSRFToken();
        setCSRFTokenCookie(res, csrfToken);

        logger.info("Email verified and user logged in", {
          userId: response.user._id,
          email,
          ip: req.ip,
          isNewSession: response.isNewSession
        });

        return res.status(200).json({
          success: true,
          message: response.message,
          token: response.token
        });
      } else {
        const response = await authService.verifyForgotPasswordOtp(email, otp);
        return res.status(200).json({ success: true, data: response });
      }
    } catch (err: any) {
      const message = (err as any)?.message || "OTP verification failed";
      return res.status(400).json({ success: false, message });
    }
  }

  static async forgotPasswordRequest(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });

      const user = await User.findOne({
        email: email.toLowerCase().trim(),
        isDeleted: false
      });
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const resendCount = await getResendCount(email, "forgot-password");
      if (resendCount >= OTP_RESEND_LIMIT) {
        return res.status(429).json({
          success: false,
          message: "Resend OTP limit reached for today. Try again tomorrow."
        });
      }
      await incrementResend(email, "forgot-password");

      await authService.generateAndStoreOtp(email, "forgot-password");

      return res.status(200).json({
        success: true,
        message: "OTP sent to email for password reset"
      });
    } catch (err: any) {
      const message =
        (err as any)?.message || "Failed to request forgot password";
      return res.status(500).json({ success: false, message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const token = req.params.token;
      const { newPassword } = req.body;

      if (!token)
        return res
          .status(400)
          .json({ success: false, message: "Token is required" });
      if (!newPassword)
        return res
          .status(400)
          .json({ success: false, message: "New password is required" });

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res
          .status(500)
          .json({ success: false, message: "JWT_SECRET is required" });
      }

      let payload: any;
      try {
        payload = jwt.verify(token, secret) as any;
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired token" });
      }

      const email = (payload.email ?? payload.id) ? undefined : undefined;

      const userId = payload.id;
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "Invalid token payload" });

      const redisKey = `forgot-password-token:${
        payload.id || payload.email || payload.sub || payload.hash
      }`;

      const stored = await redisClient.get(
        `forgot-password-token:${payload.email ?? payload.id}`
      );
      if (!stored || stored !== token) {
        const storedById = await redisClient.get(
          `forgot-password-token:${payload.id}`
        );
        if (!storedById || storedById !== token) {
          return res
            .status(400)
            .json({ success: false, message: "Token not found or expired" });
        }
      }

      await authService.resetPasswordWithToken(token, newPassword);

      await redisClient.del(
        `forgot-password-token:${payload.email ?? payload.id}`
      );

      return res
        .status(200)
        .json({ success: true, message: "Password reset successful" });
    } catch (err: any) {
      const message = (err as any)?.message || "Password reset failed";
      return res.status(500).json({ success: false, message });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      logger.info("Logout attempt", {
        userId,
        hasUser: !!req.user,
        hasCookie: !!req.cookies?.token
      });

      if (userId) {
        const token = req.cookies?.token;
        if (token) {
          try {
            const decoded = jwt.verify(
              token,
              process.env.JWT_SECRET as string
            ) as any;
            const jti = decoded.jti;

            logger.info("Token decoded", {
              userId,
              jti,
              hasJti: !!jti
            });

            if (jti) {
              const session = await SessionService.validateSession(userId, jti);

              logger.info("Session validation result", {
                userId,
                jti,
                sessionFound: !!session,
                sessionId: session?._id
              });

              if (session) {
                const logoutResult = await SessionService.logoutSession(
                  userId,
                  String(session._id)
                );

                logger.info("Session logout result", {
                  userId,
                  sessionId: session._id,
                  success: logoutResult
                });
              }
            }
          } catch (jwtError) {
            logger.warn("JWT verification failed during logout", {
              userId,
              error: (jwtError as any).message
            });
          }
        }
      }

      clearAuthCookies(res);

      logger.info("User logged out", {
        userId,
        ip: req.ip,
        userAgent: req.get("user-agent")
      });

      return res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (err: any) {
      logger.error("Logout error", {
        error: err.message,
        ip: req.ip
      });

      return res.status(500).json({
        success: false,
        message: "Logout failed"
      });
    }
  }
}
