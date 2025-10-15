export function buildOtpHtml(
  context: "signup" | "forgot-password",
  otp: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title =
    context === "signup" ? "Welcome to Satfera!" : "Password reset requested";
  const subtitle =
    context === "signup"
      ? "Use the OTP below to complete your signup."
      : "Use the OTP below to reset your password.";
  const preheader =
    context === "signup"
      ? "Complete your signup with this OTP — valid for 5 minutes."
      : "Reset your password with this OTP — valid for 5 minutes.";

  return {
    html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>
      /* Simple, email-safe inline styles */
      body { background: #f4f6fb; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #333; }
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20, 30, 60, 0.08); }
      .header { padding: 22px; text-align: center; border-bottom: 1px solid #eef2f7; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .content { padding: 28px; }
      .title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .otp { display: inline-block; padding: 14px 22px; font-size: 22px; letter-spacing: 4px; border-radius: 8px; background: #0b63ff; color: #ffffff; font-weight: 700; margin: 14px 0; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      a { color: #0b63ff; text-decoration: none; }
      @media (max-width: 420px) {
        .otp { font-size: 20px; padding: 12px 16px; }
        .content { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <span style="display:none;max-height:0px;overflow:hidden;">${preheader}</span>
    <div class="container" role="article" aria-label="${title}">
      <div class="header">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="${brandName} logo" class="logo">`
            : `<div style="font-weight:700;color:#0b63ff;font-size:18px">${brandName}</div>`
        }
      </div>
      <div class="content">
        <h1 class="title">${title}</h1>
        <p class="subtitle">${subtitle}</p>

        <div style="text-align:center;">
          <div class="otp" aria-label="One time password">${otp}</div>
        </div>

        <p class="note">This OTP expires in <strong>5 minutes</strong>. Do not share it with anyone. If you didn't request this, please ignore this email or contact our support.</p>

        <p style="margin-top:18px;">Thanks,<br><strong>${brandName} Team</strong></p>
      </div>

      <div class="footer">
        ${brandName} • If you need help, reply to this email or visit our support center.
      </div>
    </div>
  </body>
</html>
    `,
    text: `${title}\n\n${subtitle}\n\nOTP: ${otp}\n\nThis OTP expires in 5 minutes. If you didn't request this, ignore this message.\n\n— ${brandName} Team`,
  };
}

export function buildResetPasswordHtml(
  resetLink: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title = "Reset your password";
  const preheader =
    "Click the link to reset your Satfera password — valid for 5 minutes.";

  return {
    html: `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>
      body { background: #f4f6fb; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #333; }
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20, 30, 60, 0.08); }
      .header { padding: 22px; text-align: center; border-bottom: 1px solid #eef2f7; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .content { padding: 28px; }
      .title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .btn { display: inline-block; padding: 12px 20px; border-radius: 8px; background: #0b63ff; color: #fff; font-weight: 600; text-decoration: none; font-size: 15px; }
      .link { word-break: break-all; font-size: 13px; color: #0b63ff; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      @media (max-width: 420px) {
        .content { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <span style="display:none;max-height:0px;overflow:hidden;">${preheader}</span>
    <div class="container" role="article" aria-label="${title}">
      <div class="header">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="${brandName} logo" class="logo">`
            : `<div style="font-weight:700;color:#0b63ff;font-size:18px">${brandName}</div>`
        }
      </div>

      <div class="content">
        <h1 class="title">${title}</h1>
        <p class="subtitle">We received a request to reset your password. Click the button below to proceed.</p>

        <div style="text-align:center; margin: 18px 0;">
          <a class="btn" href="${resetLink}" target="_blank" rel="noopener noreferrer">Reset password</a>
        </div>

        <p style="font-size:13px;color:#7a8598">If the button doesn't work, copy and paste this link into your browser:</p>
        <p class="link">${resetLink}</p>

        <p class="note">The link is valid for <strong>5 minutes</strong>. If you didn't request a password reset, safely ignore this email or contact support.</p>

        <p style="margin-top:18px;">Thanks,<br><strong>${brandName} Team</strong></p>
      </div>

      <div class="footer">
        ${brandName} • If you need help, reply to this email or visit our support center.
      </div>
    </div>
  </body>
</html>
    `,
    text: `Reset your password\n\nWe received a request to reset your password. Use the link below to reset it (valid for 5 minutes):\n\n${resetLink}\n\nIf you didn't request this, ignore this message.\n\n— ${brandName} Team`,
  };
}
