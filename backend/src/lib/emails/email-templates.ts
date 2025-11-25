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
    text: `${title}\n\n${subtitle}\n\nOTP: ${otp}\n\nThis OTP expires in 5 minutes. If you didn't request this, ignore this message.\n\n— ${brandName} Team`
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
    text: `Reset your password\n\nWe received a request to reset your password. Use the link below to reset it (valid for 5 minutes):\n\n${resetLink}\n\nIf you didn't request this, ignore this message.\n\n— ${brandName} Team`
  };
}

export function buildWelcomeHtml(
  userName: string,
  username: string,
  loginLink: string,
  supportContact: string | undefined,
  brandName = "SATFERA",
  logoUrl?: string
) {
  const title = `Welcome to ${brandName} – Your Matrimony Journey Begins`;
  const preheader = `Welcome to ${brandName}. Here are your login details and next steps to complete your profile.`;

  const supportLine = supportContact
    ? `If you need any help, feel free to contact our support team at ${supportContact}.`
    : "If you need any help, feel free to contact our support team.";

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>
      body { background: #f4f6fb; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #333; }
      .container { max-width: 680px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20,30,60,0.08); }
      .header { padding: 22px; text-align: center; border-bottom: 1px solid #eef2f7; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .content { padding: 28px; }
      .title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .login { display: inline-block; padding: 10px 16px; border-radius: 8px; background: #0b63ff; color: #fff; font-weight: 600; text-decoration: none; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      a { color: #0b63ff; text-decoration: none; }
      @media (max-width:420px) { .content { padding: 18px; } }
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
        <p class="subtitle">Dear ${userName},</p>

        <p>Thank you for registering with <strong>${brandName} Matrimony</strong>. We are delighted to have you with us.</p>

        <h3>Here are your login details:</h3>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Login Link:</strong> <a href="${loginLink}" target="_blank" rel="noopener noreferrer">Click here to Login</a></li>
        </ul>

        <p>To help you get started, please follow the step-by-step process to complete your profile:</p>
        <ol>
          <li><strong>Login</strong> to your ${brandName} account using the above details.</li>
          <li><strong>Upload your ID proof</strong> (Aadhar Card / Driving Licence / Passport / or any other valid photo ID) for verification.</li>
          <li><strong>Upload your photographs</strong> – clear face photo and a full-length photo are required.</li>
          <li><strong>Complete your personal details</strong> – education, profession, family background, lifestyle, and preferences.</li>
          <li><strong>Save & Submit</strong> your profile for review.</li>
        </ol>

        <p style="font-size:14px">👉 A verified and complete profile increases your chances of getting better matches.</p>

        <p>${supportLine}</p>

        <p>Best Regards,<br><strong>Team ${brandName}</strong><br><em>Your Trusted Matchmaking Partner</em></p>
      </div>
      <div class="footer">
        ${brandName} • If you need help, reply to this email or visit our support center.
      </div>
    </div>
  </body>
</html>
  `;

  const text = `${title}

Dear ${userName},

Thank you for registering with ${brandName} Matrimony. We are delighted to have you with us.

Here are your login details:
Username: ${username}
Login Link: ${loginLink}

Steps to complete your profile:
1) Login to your ${brandName} account using the above details.
2) Upload your ID proof (Aadhar/Driving Licence/Passport/etc.) for verification.
3) Upload your photographs – clear face photo and full-length photo.
4) Complete your personal details – education, profession, family background, lifestyle, and preferences.
5) Save & Submit your profile for review.

${supportLine}

Best Regards,
Team ${brandName}
Your Trusted Matchmaking Partner`;

  return { html, text };
}

export function buildProfileReviewSubmissionHtml(
  userName: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title = "Your Profile Submitted for Review";
  const preheader =
    "Thank you for submitting your profile to Satfera. Your details are under review.";

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
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20,30,60,0.08); }
      .header { padding: 22px; text-align: center; border-bottom: 1px solid #eef2f7; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .header-text { color: white; font-weight: 700; font-size: 18px; }
      .content { padding: 28px; }
      .title { font-size: 22px; font-weight: 600; margin: 0 0 8px; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .status-box { background: #f9f7f5; padding: 16px; border-radius: 8px; margin: 16px 0; }
      .status-text { font-weight: 600; margin-bottom: 4px; }
      .status-value { color: #556077; font-size: 14px; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; line-height: 1.6; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      a { text-decoration: none; }
      @media (max-width:420px) { .content { padding: 18px; } }
    </style>
  </head>
  <body>
    <span style="display:none;max-height:0px;overflow:hidden;">${preheader}</span>
    <div class="container" role="article" aria-label="${title}">
      <div class="header">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="${brandName} logo" class="logo">`
            : `<div class="header-text">${brandName}</div>`
        }
      </div>
      <div class="content">
        <h1 class="title">✓ Profile Successfully Submitted</h1>
        <p class="subtitle">Dear ${userName},</p>

        <p>Thank you for submitting your profile to <strong>${brandName}</strong>. We've received your details successfully, and they are currently under review.</p>

        <div class="status-box">
          <div class="status-text">📋 Current Status</div>
          <div class="status-value">Under Review - Our team will verify your documents and profile information within 24-48 hours.</div>
        </div>

        <p>During the review process, our team will:</p>
        <ul style="color: #556077; font-size: 14px; line-height: 1.8;">
          <li>Verify your government ID and submitted documents</li>
          <li>Review your profile photos and personal information</li>
          <li>Ensure compliance with our community guidelines</li>
          <li>Validate all submitted details</li>
        </ul>

        <p class="note">
          <strong>What's next?</strong><br>
          Once the review is complete, we'll send you an approval email with further instructions. You can then access your profile and start connecting with other members on ${brandName}.
        </p>

        <p class="note">
          If there are any issues with your profile, we'll reach out to you with details and next steps.
        </p>

        <p style="margin-top: 20px;">Best regards,<br><strong>Team ${brandName}</strong><br><em>Your Trusted Matrimony Partner</em></p>
      </div>
      <div class="footer">
        ${brandName} • If you have any questions, contact us at support@satfera.com
      </div>
    </div>
  </body>
</html>
    `,
    text: `${title}

Dear ${userName},

Thank you for submitting your profile to ${brandName}. We've received your details successfully, and they are currently under review.

Current Status:
Under Review - Our team will verify your documents and profile information within 24-48 hours.

During the review process, our team will:
- Verify your government ID and submitted documents
- Review your profile photos and personal information
- Ensure compliance with our community guidelines
- Validate all submitted details

What's next?
Once the review is complete, we'll send you an approval email with further instructions. You can then access your profile and start connecting with other members on ${brandName}.

If there are any issues with your profile, we'll reach out to you with details and next steps.

Best regards,
Team ${brandName}
Your Trusted Matrimony Partner`
  };
}

export function buildProfileApprovedHtml(
  userName: string,
  loginLink: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title = "🎉 Your Profile is Approved!";
  const preheader =
    "Great news! Your profile has been approved and is now live.";

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
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20,30,60,0.08); }
      .header { padding: 22px; text-align: center;  }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .header-text { color: white; font-weight: 700; font-size: 18px; }
      .content { padding: 28px; }
      .title { font-size: 24px; font-weight: 600; margin: 0 0 8px; color: #27ae60; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .status-box { background: #eafaf1; border-left: 4px solid #27ae60; padding: 16px; border-radius: 8px; margin: 16px 0; }
      .status-text { font-weight: 600; color: #27ae60; margin-bottom: 4px; }
      .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; background: #D4A052;  font-weight: 600; text-decoration: none; font-size: 14px; margin-top: 12px; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; line-height: 1.6; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      @media (max-width:420px) { .content { padding: 18px; } }
    </style>
  </head>
  <body>
    <span style="display:none;max-height:0px;overflow:hidden;">${preheader}</span>
    <div class="container" role="article" aria-label="${title}">
      <div class="header">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="${brandName} logo" class="logo">`
            : `<div class="header-text">${brandName}</div>`
        }
      </div>
      <div class="content">
        <h1 class="title">✓ Profile Approved Successfully!</h1>
        <p class="subtitle">Dear ${userName},</p>

        <p>Great news! Your profile has been approved and is now <strong>live on ${brandName}</strong>. You're all set to start connecting with other members and explore potential matches.</p>

        <div class="status-box">
          <div class="status-text">✓ Your Profile Status: APPROVED</div>
          <div style="color: #556077; font-size: 14px;">Your profile is now visible to other users on the platform.</div>
        </div>

        <p><strong>Here's what you can do now:</strong></p>
        <ul style="color: #556077; font-size: 14px; line-height: 1.8;">
          <li>✓ View and browse other member profiles</li>
          <li>✓ Send connection requests and show interest</li>
          <li>✓ Receive and respond to connection requests</li>
          <li>✓ Complete your profile with more details and preferences</li>
          <li>✓ Update your photos and information anytime</li>
        </ul>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${loginLink}" class="btn">Go to Dashboard</a>
        </div>

        <p class="note" style="margin-top: 24px;">
          <strong>Need help?</strong> If you have any questions about your profile or how to use ${brandName}, feel free to reach out to our support team.
        </p>

        <p style="margin-top: 20px;">Best regards,<br><strong>Team ${brandName}</strong><br><em>Your Trusted Matrimony Partner</em></p>
      </div>
      <div class="footer">
        ${brandName} • If you need help, reply to this email or visit our support center.
      </div>
    </div>
  </body>
</html>
    `,
    text: `${title}

Dear ${userName},

Great news! Your profile has been approved and is now live on ${brandName}. You're all set to start connecting with other members and explore potential matches.

Your Profile Status: APPROVED
Your profile is now visible to other users on the platform.

Here's what you can do now:
✓ View and browse other member profiles
✓ Send connection requests and show interest
✓ Receive and respond to connection requests
✓ Complete your profile with more details and preferences
✓ Update your photos and information anytime

Go to your dashboard: ${loginLink}

Need help? If you have any questions about your profile or how to use ${brandName}, feel free to reach out to our support team.

Best regards,
Team ${brandName}
Your Trusted Matrimony Partner`
  };
}

export function buildProfileRejectedHtml(
  userName: string,
  reason: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title = "Profile Review Status - Information Needed";
  const preheader = "We need some additional information about your profile.";

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
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20,30,60,0.08); }
      .header { padding: 22px; text-align: center; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .header-text { color: white; font-weight: 700; font-size: 18px; }
      .content { padding: 28px; }
      .title { font-size: 20px; font-weight: 600; margin: 0 0 8px; color: #c0392b; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .status-box { background: #fadbd8; border-left: 4px solid #e74c3c; padding: 16px; border-radius: 8px; margin: 16px 0; }
      .status-text { font-weight: 600; color: #c0392b; margin-bottom: 4px; }
      .reason-text { color: #556077; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; line-height: 1.6; }
      .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; background: #D4A052;  font-weight: 600; text-decoration: none; font-size: 14px; margin-top: 12px; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      @media (max-width:420px) { .content { padding: 18px; } }
    </style>
  </head>
  <body>
    <span style="display:none;max-height:0px;overflow:hidden;">${preheader}</span>
    <div class="container" role="article" aria-label="${title}">
      <div class="header">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="${brandName} logo" class="logo">`
            : `<div class="header-text">${brandName}</div>`
        }
      </div>
      <div class="content">
        <h1 class="title">⚠ Profile Review - Action Required</h1>
        <p class="subtitle">Dear ${userName},</p>

        <p>We've reviewed your profile submission for <strong>${brandName}</strong>. To proceed, we need some additional information or corrections.</p>

        <div class="status-box">
          <div class="status-text">Reason for Review:</div>
          <div class="reason-text">${reason}</div>
        </div>

        <p><strong>What you need to do:</strong></p>
        <ol style="color: #556077; font-size: 14px; line-height: 1.8;">
          <li>Review the information mentioned above</li>
          <li>Update or correct your profile information</li>
          <li>Resubmit your profile for review</li>
        </ol>

        <p class="note">
          <strong>Note:</strong> We're here to help! If you're unsure about any of the feedback, please reach out to our support team for clarification.
        </p>

        <div style="text-align: center; margin-top: 20px;">
          <a href="${
            process.env.FRONTEND_URL || "https://satfera.com"
          }/onboarding/review" class="btn">Review & Update Profile</a>
        </div>

        <p style="margin-top: 20px;">Best regards,<br><strong>Team ${brandName}</strong><br><em>Your Trusted Matrimony Partner</em></p>
      </div>
      <div class="footer">
        ${brandName} • If you need help, reply to this email or contact us at support@satfera.com
      </div>
    </div>
  </body>
</html>
    `,
    text: `${title}

Dear ${userName},

We've reviewed your profile submission for ${brandName}. To proceed, we need some additional information or corrections.

Reason for Review:
${reason}

What you need to do:
1. Review the information mentioned above
2. Update or correct your profile information
3. Resubmit your profile for review

Note: We're here to help! If you're unsure about any of the feedback, please reach out to our support team for clarification.

Best regards,
Team ${brandName}
Your Trusted Matrimony Partner`
  };
}

export function buildAccountDeactivationHtml(
  userName: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title = "Account Deactivated";
  const preheader = "Your account has been deactivated as requested.";

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
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20,30,60,0.08); }
      .header { padding: 22px; text-align: center; border-bottom: 1px solid #eef2f7; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .content { padding: 28px; }
      .title { font-size: 20px; font-weight: 600; margin: 0 0 8px; color: #e67e22; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .info-box { background: #fef5e7; border-left: 4px solid #e67e22; padding: 16px; border-radius: 8px; margin: 16px 0; }
      .info-text { font-weight: 600; color: #e67e22; margin-bottom: 4px; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; line-height: 1.6; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      @media (max-width:420px) { .content { padding: 18px; } }
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
        <h1 class="title">⏸ Account Deactivated</h1>
        <p class="subtitle">Dear ${userName},</p>

        <p>Your <strong>${brandName}</strong> account has been deactivated as per your request.</p>

        <div class="info-box">
          <div class="info-text">⏰ Reactivation Period</div>
          <div style="color: #556077; font-size: 14px;">You can reactivate your account after 24 hours from now.</div>
        </div>

        <p><strong>What this means:</strong></p>
        <ul style="color: #556077; font-size: 14px; line-height: 1.8;">
          <li>Your profile is hidden from other members</li>
          <li>You won't receive connection requests or notifications</li>
          <li>Your data is safely stored and will be restored when you reactivate</li>
          <li>You can reactivate anytime after 24 hours</li>
        </ul>

        <p class="note">
          <strong>Need to reactivate?</strong> Simply log in after 24 hours and click on "Activate Account" from your account settings.
        </p>

        <p class="note">
          If you didn't request this deactivation or have any concerns, please contact our support team immediately.
        </p>

        <p style="margin-top: 20px;">Best regards,<br><strong>Team ${brandName}</strong><br><em>Your Trusted Matrimony Partner</em></p>
      </div>
      <div class="footer">
        ${brandName} • If you need help, reply to this email or contact us at support@satfera.com
      </div>
    </div>
  </body>
</html>
    `,
    text: `${title}

Dear ${userName},

Your ${brandName} account has been deactivated as per your request.

Reactivation Period:
You can reactivate your account after 24 hours from now.

What this means:
- Your profile is hidden from other members
- You won't receive connection requests or notifications
- Your data is safely stored and will be restored when you reactivate
- You can reactivate anytime after 24 hours

Need to reactivate? Simply log in after 24 hours and click on "Activate Account" from your account settings.

If you didn't request this deactivation or have any concerns, please contact our support team immediately.

Best regards,
Team ${brandName}
Your Trusted Matrimony Partner`
  };
}

export function buildAccountDeletionHtml(
  userName: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title = "Account Deleted";
  const preheader = "Your account has been deleted as requested.";

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
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20,30,60,0.08); }
      .header { padding: 22px; text-align: center; border-bottom: 1px solid #eef2f7; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .content { padding: 28px; }
      .title { font-size: 20px; font-weight: 600; margin: 0 0 8px; color: #c0392b; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .info-box { background: #fadbd8; border-left: 4px solid #e74c3c; padding: 16px; border-radius: 8px; margin: 16px 0; }
      .info-text { font-weight: 600; color: #c0392b; margin-bottom: 4px; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; line-height: 1.6; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      @media (max-width:420px) { .content { padding: 18px; } }
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
        <h1 class="title">Account Deleted</h1>
        <p class="subtitle">Dear ${userName},</p>

        <p>We're sorry to see you go. Your <strong>${brandName}</strong> account has been deleted as per your request.</p>

        <div class="info-box">
          <div class="info-text">✓ Deletion Confirmed</div>
          <div style="color: #556077; font-size: 14px;">Your profile has been removed successfully.</div>
        </div>

        <p><strong>What happens next:</strong></p>
        <ul style="color: #556077; font-size: 14px; line-height: 1.8;">
          <li>You can create a new account anytime using the same email or phone number</li>
        </ul>

        <p class="note">
          <strong>Changed your mind?</strong> You're always welcome back! You can create a new account anytime by signing up again with your email or phone number.
        </p>

        <p class="note">
          We'd love to hear your feedback on how we can improve ${brandName}. If you have a moment, please let us know why you decided to leave.
        </p>

        <p style="margin-top: 20px;">Thank you for being part of ${brandName}. We wish you all the best in your journey.<br><br><strong>Team ${brandName}</strong><br><em>Your Trusted Matrimony Partner</em></p>
      </div>
      <div class="footer">
        ${brandName} • If you need help, reply to this email or contact us at support@satfera.com
      </div>
    </div>
  </body>
</html>
    `,
    text: `${title}

Dear ${userName},

We're sorry to see you go. Your ${brandName} account has been deleted as per your request.

Deletion Confirmed:
Your profile has been removed and is no longer visible to other members.

What happens next:
- Your profile is hidden from all members
- You won't receive any notifications or connection requests
- Your data is retained for administrative purposes but not visible to other users
- You can create a new account anytime using the same email or phone number

Changed your mind? You're always welcome back! You can create a new account anytime by signing up again with your email or phone number.

We'd love to hear your feedback on how we can improve ${brandName}. If you have a moment, please let us know why you decided to leave.

Thank you for being part of ${brandName}. We wish you all the best in your journey.

Team ${brandName}
Your Trusted Matrimony Partner`
  };
}

export function buildAccountActivationHtml(
  userName: string,
  brandName = "Satfera",
  logoUrl?: string
) {
  const title = "Account Activated";
  const preheader = "Welcome back! Your account has been activated.";

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
      .container { max-width: 620px; margin: 28px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 18px rgba(20,30,60,0.08); }
      .header { padding: 22px; text-align: center; border-bottom: 1px solid #eef2f7; }
      .logo { height: 44px; display: inline-block; margin-bottom: 6px; }
      .content { padding: 28px; }
      .title { font-size: 20px; font-weight: 600; margin: 0 0 8px; color: #27ae60; }
      .subtitle { margin: 0 0 18px; color: #556077; font-size: 14px; }
      .info-box { background: #d5f4e6; border-left: 4px solid #27ae60; padding: 16px; border-radius: 8px; margin: 16px 0; }
      .info-text { font-weight: 600; color: #27ae60; margin-bottom: 4px; }
      .note { font-size: 13px; color: #7a8598; margin-top: 14px; line-height: 1.6; }
      .footer { padding: 18px; text-align: center; font-size: 12px; color: #9aa3b2; border-top: 1px solid #f0f4fb; }
      @media (max-width:420px) { .content { padding: 18px; } }
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
        <h1 class="title">🎉 Account Activated!</h1>
        <p class="subtitle">Dear ${userName},</p>

        <p>Welcome back to <strong>${brandName}</strong>! Your account has been successfully activated.</p>

        <div class="info-box">
          <div class="info-text">✓ Activation Confirmed</div>
          <div style="color: #556077; font-size: 14px;">Your profile is now visible to other members and you can resume your matrimony journey.</div>
        </div>

        <p><strong>What's enabled:</strong></p>
        <ul style="color: #556077; font-size: 14px; line-height: 1.8;">
          <li>Your profile is visible to other members</li>
          <li>You can browse and connect with potential matches</li>
          <li>You'll receive connection requests and notifications</li>
          <li>All features are now accessible</li>
        </ul>

        <p class="note">
          You can now log in and continue exploring profiles to find your perfect match!
        </p>

        <p style="margin-top: 20px;">We're glad to have you back!<br><br><strong>Team ${brandName}</strong><br><em>Your Trusted Matrimony Partner</em></p>
      </div>
      <div class="footer">
        ${brandName} • If you need help, reply to this email or contact us at support@satfera.com
      </div>
    </div>
  </body>
</html>
    `,
    text: `${title}

Dear ${userName},

Welcome back to ${brandName}! Your account has been successfully activated.

Activation Confirmed:
Your profile is now visible to other members and you can resume your matrimony journey.

What's enabled:
- Your profile is visible to other members
- You can browse and connect with potential matches
- You'll receive connection requests and notifications
- All features are now accessible

You can now log in and continue exploring profiles to find your perfect match!

We're glad to have you back!

Team ${brandName}
Your Trusted Matrimony Partner`
  };
}
