import { Twilio } from "twilio";
import { AuthenticatedRequest } from "../types/types";
import { Response } from "express";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";

const client = new Twilio(accountSid, authToken);

async function sendOtp(req: AuthenticatedRequest, res: Response) {
  const { countryCode, phoneNumber } = req.body;
  try {
    if (!countryCode) {
      res.status(400).json({ message: "Country code is required" });
      return;
    }
    if (!phoneNumber) {
      res.status(400).json({ message: "Phone number is required" });
      return;
    }
    const verification = await client.verify
      .services(verifyServiceSid)
      .verifications.create({
        to: `${countryCode}${phoneNumber}`,
        channel: "sms",
      });
    console.log("Verification status:", verification.status);
    res
      .status(200)
      .json({ message: "OTP sent successfully", data: verification });
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
}

async function verifyOtp(req: AuthenticatedRequest, res: Response) {
  const { countryCode, phoneNumber, code } = req.body;
  try {
    if (!countryCode) {
      res.status(400).json({ message: "Country code is required" });
      return;
    }

    if (!phoneNumber) {
      res.status(400).json({ message: "Phone number is required" });
      return;
    }

    if (!code) {
      res.status(400).json({ message: "OTP code is required" });
      return;
    }

    const verificationCheck = await client.verify
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: `${countryCode}${phoneNumber}`,
        code: code,
      });
    console.log("Verification check status:", verificationCheck.status);
    res
      .status(200)
      .json({ message: "OTP verified successfully", data: verificationCheck });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
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
