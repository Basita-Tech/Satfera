import { Twilio } from "twilio";
import { Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../../types";
import { User } from "../../models";
import { enqueueWelcomeEmail } from "../../lib/queue/enqueue";
import { logger } from "../../lib/common";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";

const client = new Twilio(accountSid, authToken);

async function sendOtp(req: AuthenticatedRequest, res: Response) {
  const { countryCode, phoneNumber } = req.body;
  try {
    if (!countryCode) {
      return res
        .status(400)
        .json({ success: false, message: "Country code is required" });
    }
    if (!phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: `${countryCode}${phoneNumber}`,
        channel: "sms"
      });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: verification
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    // Twilio specific rate limit error
    if (error.code === 60203) {
      return res.status(400).json({
        success: false,
        message: "Too many requests. Please try again later."
      });
    }
    // Helpful guidance for a common Twilio 20404 resource-not-found error
    if (error?.code === 20404 || error?.status === 404) {
      return res.status(400).json({
        success: false,
        message:
          "Twilio Verify Service not found. Please check TWILIO_VERIFY_SERVICE_SID, TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables (they should belong to the same Twilio account).",
        hint: "Verify the Verify Service SID in the Twilio console (Services > Verify) and ensure the service SID belongs to the account whose ACCOUNT_SID/AUTH_TOKEN you configured."
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to send OTP"
    });
  }
}

async function verifyOtp(req: AuthenticatedRequest, res: Response) {
  const { countryCode, phoneNumber, code } = req.body;
  try {
    if (!countryCode) {
      return res
        .status(400)
        .json({ success: false, message: "Country code is required" });
    }

    if (!phoneNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "OTP code is required" });
    }
    const mobileNumber = `${countryCode}${phoneNumber}`;
    const user = await User.findOne({
      phoneNumber: mobileNumber,
      isDeleted: false
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: `${countryCode}${phoneNumber}`,
        code: code
      });

    if (user.isPhoneVerified) {
      return res.status(200).json({
        success: true,
        message: "Phone number is already verified",
        data: verificationCheck
      });
    }

    if (verificationCheck.status === "approved" && !user.isPhoneVerified) {
      user.isPhoneVerified = true;
      await user.save();

      if (user.isEmailVerified && !user.welcomeSent) {
        try {
          const username = user.email || user.phoneNumber || "";
          const loginLink = `${process.env.FRONTEND_URL || ""}/login`;

          // Enqueue welcome email instead of sending directly
          const enqueued = await enqueueWelcomeEmail(
            user._id as any,
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
          } else {
            logger.error(`Failed to queue welcome email for ${user.email}`);
          }
        } catch (e) {
          logger.error(`Failed to queue welcome email for ${user.email}:`, e);
        }
      }
    }

    if (verificationCheck.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code"
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    if (user.isEmailVerified && user.isPhoneVerified) {
      const token = jwt.sign({ id: user._id }, secret, {
        expiresIn: "1d"
      });

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        data: { token, user }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Phone verified successfully",
      data: verificationCheck
    });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    // If Twilio returns resource-not-found for verification check, give clearer guidance
    if (error?.code === 20404 || error?.status === 404) {
      return res.status(400).json({
        success: false,
        message:
          "Twilio Verify Service or VerificationCheck resource not found. Check TWILIO_VERIFY_SERVICE_SID, TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (they must be for the same Twilio account).",
        hint: "If you recently created the Verify Service, ensure its SID (starts with 'VA...') is correct and that the credentials used belong to the same Twilio account."
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to verify OTP"
    });
  }
}

async function createMessage(message: string, to: string) {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new Error("TWILIO_PHONE_NUMBER environment variable is not set");
  }
  const msg = await client.messages.create({
    body: message,
    from: from,
    to: to
  });

  return msg;
}

export { sendOtp, verifyOtp, createMessage };
