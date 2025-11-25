import nodemailer from "nodemailer";
import {
  buildOtpHtml,
  buildResetPasswordHtml,
  buildWelcomeHtml,
  buildProfileReviewSubmissionHtml,
  buildProfileApprovedHtml,
  buildProfileRejectedHtml,
  buildAccountDeactivationHtml,
  buildAccountDeletionHtml
} from "./email-templates";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
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
      ...options
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
    logoUrl: "https://nodemailer.com/img/nm_logo_200x136.png"
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
    logoUrl: "https://nodemailer.com/img/nm_logo_200x136.png"
  };
  const { html, text } = buildResetPasswordHtml(
    resetLink,
    options?.brandName,
    options?.logoUrl
  );
  const subject = "Reset Your Satfera Password";
  return sendMail({ to, subject, html, text });
}

export async function sendWelcomeEmail(
  to: string,
  userName: string,
  username: string,
  loginLink: string,
  supportContact?: string
) {
  const options = {
    brandName: process.env.BRAND_NAME || "SATFERA",
    logoUrl: process.env.BRAND_LOGO_URL
  };

  const { html, text } = buildWelcomeHtml(
    userName,
    username,
    loginLink,
    supportContact,
    options.brandName,
    options.logoUrl
  );

  const subject = `Welcome to ${options.brandName} – Your Matrimony Journey Begins`;
  return sendMail({ to, subject, html, text });
}

export async function sendProfileReviewSubmissionEmail(
  to: string,
  userName: string
) {
  const options = {
    brandName: process.env.BRAND_NAME || "Satfera",
    logoUrl:
      process.env.BRAND_LOGO_URL ||
      "https://nodemailer.com/img/nm_logo_200x136.png"
  };

  const { html, text } = buildProfileReviewSubmissionHtml(
    userName,
    options.brandName,
    options.logoUrl
  );

  const subject = "Your Profile Submitted for Review - Satfera";
  return sendMail({ to, subject, html, text });
}

export async function sendProfileApprovedEmail(
  to: string,
  userName: string,
  dashboardLink: string
) {
  const options = {
    brandName: process.env.BRAND_NAME || "Satfera",
    logoUrl:
      process.env.BRAND_LOGO_URL ||
      "https://nodemailer.com/img/nm_logo_200x136.png"
  };

  const { html, text } = buildProfileApprovedHtml(
    userName,
    dashboardLink,
    options.brandName,
    options.logoUrl
  );

  const subject = "🎉 Your Satfera Profile Has Been Approved!";
  return sendMail({ to, subject, html, text });
}

export async function sendProfileRejectedEmail(
  to: string,
  userName: string,
  reason: string
) {
  const options = {
    brandName: process.env.BRAND_NAME || "Satfera",
    logoUrl:
      process.env.BRAND_LOGO_URL ||
      "https://nodemailer.com/img/nm_logo_200x136.png"
  };

  const { html, text } = buildProfileRejectedHtml(
    userName,
    reason,
    options.brandName,
    options.logoUrl
  );

  const subject = "Satfera Profile Review - Action Required";
  return sendMail({ to, subject, html, text });
}

export async function sendAccountDeactivationEmail(
  to: string,
  userName: string
) {
  const options = {
    brandName: process.env.BRAND_NAME || "Satfera",
    logoUrl:
      process.env.BRAND_LOGO_URL ||
      "https://nodemailer.com/img/nm_logo_200x136.png"
  };

  const { html, text } = buildAccountDeactivationHtml(
    userName,
    options.brandName,
    options.logoUrl
  );

  const subject = "Account Deactivated - Satfera";
  return sendMail({ to, subject, html, text });
}

export async function sendAccountDeletionEmail(
  to: string,
  userName: string
) {
  const options = {
    brandName: process.env.BRAND_NAME || "Satfera",
    logoUrl:
      process.env.BRAND_LOGO_URL ||
      "https://nodemailer.com/img/nm_logo_200x136.png"
  };

  const { html, text } = buildAccountDeletionHtml(
    userName,
    options.brandName,
    options.logoUrl
  );

  const subject = "Account Deleted - Satfera";
  return sendMail({ to, subject, html, text });
}
