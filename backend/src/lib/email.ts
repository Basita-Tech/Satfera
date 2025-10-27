import nodemailer from "nodemailer";
import { buildOtpHtml, buildResetPasswordHtml } from "./email-templates";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
} as nodemailer.TransportOptions);

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: SendMailOptions): Promise<any> {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      ...options,
    });

    return info;
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send email");
  }
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  context: "signup" | "forgot-password"
) {
  const options = {
    brandName: "Satfera",
    logoUrl: "https://nodemailer.com/img/nm_logo_200x136.png",
  };

  const { html, text } = buildOtpHtml(
    context,
    otp,
    options?.brandName,
    options?.logoUrl
  );
  const subject =
    context === "signup"
      ? "Your Satfera Signup OTP"
      : "Your Satfera Password Reset OTP";

  return sendMail({ to, subject, html, text });
}

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  const options = {
    brandName: "Satfera",
    logoUrl: "https://nodemailer.com/img/nm_logo_200x136.png",
  };
  const { html, text } = buildResetPasswordHtml(
    resetLink,
    options?.brandName,
    options?.logoUrl
  );
  const subject = "Reset Your Satfera Password";
  return sendMail({ to, subject, html, text });
}
