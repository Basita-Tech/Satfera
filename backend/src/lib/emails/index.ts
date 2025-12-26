import nodemailer from "nodemailer";
import { buildEmailFromTemplate } from "./templateService";
import { EmailTemplateType } from "../../models";
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
  const templateType =
    context === "signup"
      ? EmailTemplateType.Signup
      : EmailTemplateType.ForgotPassword;

  const variables = {
    otp,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(templateType, variables);

  if (!template) {
    throw new Error(`Email template not found for type: ${templateType}`);
  }

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  const variables = {
    resetLink,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.ResetPassword,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for ResetPassword");
  }

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendWelcomeEmail(
  to: string,
  userName: string,
  username: string,
  loginLink: string,
  supportContact?: string
) {
  const variables = {
    userName,
    username,
    loginLink,
    supportContact: supportContact || "support@satfera.in",
    brandName: APP_CONFIG.BRAND_NAME || "SATFERA",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.WelcomeEmail,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for WelcomeEmail");
  }

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendProfileReviewSubmissionEmail(
  to: string,
  userName: string
) {
  const variables = {
    userName,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.ProfileReview,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for ProfileReview");
  }

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendProfileApprovedEmail(
  to: string,
  userName: string,
  dashboardLink: string
) {
  const variables = {
    userName,
    loginLink: dashboardLink,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.ProfileApproved,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for ProfileApproved");
  }

  logger.debug("Sending profile approved email", {
    to,
    userName,
    subject: template.subject
  });

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendProfileRejectedEmail(
  to: string,
  userName: string,
  reason: string
) {
  const variables = {
    userName,
    reason,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.ProfileRejected,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for ProfileRejected");
  }

  logger.debug("Sending profile rejected email", {
    to,
    userName,
    subject: template.subject
  });

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendAccountDeactivationEmail(
  to: string,
  userName: string
) {
  const variables = {
    userName,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.AccountDeactivation,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for AccountDeactivation");
  }

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendAccountDeletionEmail(to: string, userName: string) {
  const variables = {
    userName,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.AccountDeletion,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for AccountDeletion");
  }

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendAccountActivationEmail(to: string, userName: string) {
  const variables = {
    userName,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.AccountActivation,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for AccountActivation");
  }

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendProfileRectificationEmail(
  to: string,
  userName: string,
  reason: string
) {
  const variables = {
    userName,
    reason,
    brandName: APP_CONFIG.BRAND_NAME || "Satfera",
    logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
  };

  const template = await buildEmailFromTemplate(
    EmailTemplateType.ProfileRectification,
    variables
  );

  if (!template) {
    throw new Error("Email template not found for ProfileRectification");
  }

  logger.debug("Sending profile rectification email", {
    to,
    userName,
    subject: template.subject
  });

  return sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendConnectionAcceptedEmail(
  to: string,
  userName: string,
  accepterName: string,
  accepterProfileLink: string
) {
  try {
    const variables = {
      userName,
      accepterName,
      accepterProfileLink,
      brandName: APP_CONFIG.BRAND_NAME || "Satfera",
      logoUrl: APP_CONFIG.BRAND_LOGO_URL || ""
    };

    const template = await buildEmailFromTemplate(
      EmailTemplateType.ConnectionAccepted,
      variables
    );

    if (!template) {
      throw new Error("Email template not found for ConnectionAccepted");
    }

    logger.debug("Sending connection accepted email", {
      to,
      userName,
      accepterName,
      subject: template.subject
    });

    return sendMail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } catch (error: any) {
    logger.error("Error in sendConnectionAcceptedEmail:", {
      error: error.message,
      stack: error.stack,
      to,
      userName,
      accepterName
    });
    throw error;
  }
}
