import nodemailer from "nodemailer";
import {
  buildOtpHtml,
  buildResetPasswordHtml,
  buildWelcomeHtml,
  buildProfileReviewSubmissionHtml,
  buildProfileApprovedHtml,
  buildProfileRejectedHtml,
  buildAccountDeactivationHtml,
  buildAccountDeletionHtml,
  buildAccountActivationHtml
} from "./email-templates";
import { APP_CONFIG } from "../../utils/constants";
import { logger } from "../common/logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
} as nodemailer.TransportOptions);

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    logger.error("SMTP connection error:", error);
  } else {
    logger.info("SMTP connection verified successfully");
  }
});

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: SendMailOptions): Promise<any> {
  try {
    if (!options.to || !options.subject || !options.html) {
      throw new Error("Missing required email fields: to, subject, or html");
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || ""
    };

    logger.debug("Sending email", {
      to: mailOptions.to,
      subject: mailOptions.subject,
      from: mailOptions.from
    });

    const info = await transporter.sendMail(mailOptions);

    logger.info("Email sent successfully", {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId
    });

    return info;
  } catch (error: any) {
    logger.error("Email send error:", {
      error: error.message,
      to: options.to,
      subject: options.subject
    });
    throw error;
  }
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  context: "signup" | "forgot-password"
) {
  const options = {
    brandName: APP_CONFIG.BRAND_NAME,
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
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
    brandName: APP_CONFIG.BRAND_NAME,
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
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
    brandName: APP_CONFIG.BRAND_NAME || "SATFERA",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
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
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
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
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
  };

  const { html, text } = buildProfileApprovedHtml(
    userName,
    dashboardLink,
    options.brandName,
    options.logoUrl
  );

  const subject = "🎉 Your Satfera Profile Has Been Approved!";
  
  logger.debug("Sending profile approved email", {
    to,
    userName,
    subject
  });

  return sendMail({ to, subject, html, text });
}

export async function sendProfileRejectedEmail(
  to: string,
  userName: string,
  reason: string
) {
  const options = {
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
  };

  const { html, text } = buildProfileRejectedHtml(
    userName,
    reason,
    options.brandName,
    options.logoUrl
  );

  const subject = "Satfera Profile Review - Action Required";
  
  logger.debug("Sending profile rejected email", {
    to,
    userName,
    subject
  });

  return sendMail({ to, subject, html, text });
}

export async function sendAccountDeactivationEmail(
  to: string,
  userName: string
) {
  const options = {
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
  };

  const { html, text } = buildAccountDeactivationHtml(
    userName,
    options.brandName,
    options.logoUrl
  );

  const subject = "Account Deactivated - Satfera";
  return sendMail({ to, subject, html, text });
}

export async function sendAccountDeletionEmail(to: string, userName: string) {
  const options = {
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
  };

  const { html, text } = buildAccountDeletionHtml(
    userName,
    options.brandName,
    options.logoUrl
  );

  const subject = "Account Deleted - Satfera";
  return sendMail({ to, subject, html, text });
}

export async function sendAccountActivationEmail(to: string, userName: string) {
  const options = {
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL
  };

  const { html, text } = buildAccountActivationHtml(
    userName,
    options.brandName,
    options.logoUrl
  );

  const subject = "Account Activated - Satfera";
  return sendMail({ to, subject, html, text });
}
