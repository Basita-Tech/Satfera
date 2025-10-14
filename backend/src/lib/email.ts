import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || undefined,
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
  const subject =
    context === "signup"
      ? "Your Satfera Signup OTP"
      : "Your Satfera Password Reset OTP";
  const html = `<p>Your OTP is: <b>${otp}</b></p><p>This OTP is valid for 5 minutes.</p>`;
  const main = await sendMail({ to, subject, html });
  return main;
}

export async function sendResetPasswordEmail(to: string, resetLink: string) {
  const subject = "Reset Your Satfera Password";
  const html = `<p>Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link is valid for 5 minutes.</p>`;
  const main = await sendMail({ to, subject, html });
  return main;
}
