import { Twilio } from "twilio";
import { AuthenticatedRequest } from "../types/types";
import { Response } from "express";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
import { sendWelcomeEmail } from "../lib/email";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";

const client = new Twilio(accountSid, authToken);

async function sendOtp(req: AuthenticatedRequest, res: Response) {
  const { countryCode, phoneNumber } = req.body;
  try {
    if (!countryCode) {
      res
        .status(400)
        .json({ success: false, message: "Country code is required" });
      return;
    }
    if (!phoneNumber) {
      res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
      return;
    }
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: `${countryCode}${phoneNumber}`,
        channel: "sms",
      });

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: verification,
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    // Twilio specific rate limit error
    if (error.code === 60203) {
      return res.status(400).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }
    // Helpful guidance for a common Twilio 20404 resource-not-found error
    if (error?.code === 20404 || error?.status === 404) {
      return res.status(400).json({
        success: false,
        message:
          "Twilio Verify Service not found. Please check TWILIO_VERIFY_SERVICE_SID, TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables (they should belong to the same Twilio account).",
        hint: "Verify the Verify Service SID in the Twilio console (Services > Verify) and ensure the service SID belongs to the account whose ACCOUNT_SID/AUTH_TOKEN you configured.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to send OTP",
    });
  }
}

async function verifyOtp(req: AuthenticatedRequest, res: Response) {
  const { countryCode, phoneNumber, code } = req.body;
  try {
    if (!countryCode) {
      res
        .status(400)
        .json({ success: false, message: "Country code is required" });
      return;
    }

    if (!phoneNumber) {
      res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
      return;
    }

    if (!code) {
      res.status(400).json({ success: false, message: "OTP code is required" });
      return;
    }
    const mobileNumber = `${countryCode}${phoneNumber}`;
    const user = await User.findOne({ phoneNumber: mobileNumber });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: `${countryCode}${phoneNumber}`,
        code: code,
      });

    if (user.isPhoneVerified) {
      return res.status(200).json({
        success: true,
        message: "Phone number is already verified",
        data: verificationCheck,
      });
    }

    if (verificationCheck.status === "approved" && !user.isPhoneVerified) {
      user.isPhoneVerified = true;
      await user.save();

      if (user.isEmailVerified && !user.welcomeSent) {
        try {
          const username = user.email || user.phoneNumber || "";
          const loginLink = `${process.env.FRONTEND_URL || ""}/login`;
          await sendWelcomeEmail(
            user.email,
            `${(user as any).firstName || "User"} ${
              (user as any).lastName || ""
            }`.trim(),
            username,
            loginLink,
            process.env.SUPPORT_CONTACT
          );
          user.welcomeSent = true;
          await user.save();
          console.log(`Welcome email sent to ${user.email}`);
        } catch (e) {
          console.error(`Failed to send welcome email to ${user.email}:`, e);
        }
      }
    }

    if (verificationCheck.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP code",
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    if (user.isEmailVerified && user.isPhoneVerified) {
      const token = jwt.sign({ id: user._id }, secret, {
        expiresIn: "7d",
      });

      res.status(200).json({
        success: true,
        message: "OTP verified successfully",
        data: { token, user },
      });
    }
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    // If Twilio returns resource-not-found for verification check, give clearer guidance
    if (error?.code === 20404 || error?.status === 404) {
      return res.status(400).json({
        success: false,
        message:
          "Twilio Verify Service or VerificationCheck resource not found. Check TWILIO_VERIFY_SERVICE_SID, TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (they must be for the same Twilio account).",
        hint: "If you recently created the Verify Service, ensure its SID (starts with 'VA...') is correct and that the credentials used belong to the same Twilio account.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to verify OTP",
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
    to: to,
  });

  return msg;
}

export { sendOtp, verifyOtp, createMessage };
