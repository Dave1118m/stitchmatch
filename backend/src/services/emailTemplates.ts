/**
 * StitchMatch Atelier - Responsive HTML Email Templates
 * Premium design system with dark luxury theme, gold accents, and cross-client compatibility.
 */

interface BaseEmailProps {
  title: string;
  previewText: string;
  contentHtml: string;
}

function wrapBaseTemplate({ title, previewText, contentHtml }: BaseEmailProps): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0d12;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0c0d12;
      padding: 40px 10px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #161822;
      border: 1px solid #232738;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px;
      text-align: center;
      background: linear-gradient(180deg, #1c1f2e 0%, #161822 100%);
      border-bottom: 1px solid #232738;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #ffffff;
      margin: 0;
    }
    .brand-accent {
      color: #d97706;
    }
    .brand-subtitle {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-top: 4px;
    }
    .content {
      padding: 36px 32px;
    }
    .code-box {
      background: #0f111a;
      border: 2px dashed #d97706;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .code-digits {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #f59e0b;
      margin: 0;
    }
    .code-hint {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 10px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background-color: #d97706;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      border-radius: 10px;
      letter-spacing: 0.05em;
      text-align: center;
      margin: 16px 0;
    }
    .alert-box {
      background-color: #1a1512;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 6px;
      margin-top: 24px;
    }
    .alert-text {
      font-size: 12px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.5;
    }
    .footer {
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #232738;
      background-color: #11131a;
    }
    .footer-text {
      font-size: 11px;
      color: #64748b;
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <!-- Preview Text for Email Clients -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${previewText}
  </div>

  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand-name">Stitch<span class="brand-accent">Match</span></h1>
        <div class="brand-subtitle">Atelier Bespoke Platform</div>
      </div>

      <div class="content">
        ${contentHtml}
      </div>

      <div class="footer">
        <p class="footer-text">© ${currentYear} StitchMatch Atelier. All rights reserved.</p>
        <p class="footer-text">This is an automated security transmission. Please do not reply directly.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function generatePasswordResetEmail(name: string, code: string, resetUrl?: string): { subject: string; html: string; text: string } {
  const subject = `Your StitchMatch Password Reset Code: ${code}`;
  const previewText = `Your StitchMatch password reset code is ${code}. Valid for 15 minutes.`;

  const contentHtml = `
    <h2 style="font-size: 22px; font-weight: 600; color: #ffffff; margin-top: 0;">Password Reset Request</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Hello <strong>${name || 'Valued Member'}</strong>,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      We received a request to reset the password for your StitchMatch account. Use the 6-digit verification code below to proceed:
    </p>

    <div class="code-box">
      <div class="code-digits">${code}</div>
      <div class="code-hint">⏱️ Valid for 15 minutes • Do not share this code</div>
    </div>

    ${
      resetUrl
        ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Password Directly</a>
    </div>
    `
        : ''
    }

    <div class="alert-box">
      <p class="alert-text">
        <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email or change your password immediately if you suspect unauthorized access.
      </p>
    </div>
  `;

  const html = wrapBaseTemplate({ title: subject, previewText, contentHtml });
  const text = `Hello ${name || 'User'},\n\nYour StitchMatch password reset verification code is: ${code}\n\nThis code expires in 15 minutes.\nIf you did not request this, please ignore this email.\n\nStitchMatch Atelier Team`;

  return { subject, html, text };
}

export function generateVerificationCodeEmail(name: string, code: string): { subject: string; html: string; text: string } {
  const subject = `Your StitchMatch Verification Code: ${code}`;
  const previewText = `Your email verification code is ${code}.`;

  const contentHtml = `
    <h2 style="font-size: 22px; font-weight: 600; color: #ffffff; margin-top: 0;">Verify Your Email Address</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Hello <strong>${name || 'Valued Member'}</strong>,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Thank you for registering with StitchMatch Atelier. Please confirm your email address using the verification code below:
    </p>

    <div class="code-box">
      <div class="code-digits">${code}</div>
      <div class="code-hint">⏱️ Valid for 15 minutes</div>
    </div>

    <div class="alert-box">
      <p class="alert-text">
        <strong>Security Notice:</strong> Never share your verification code with anyone.
      </p>
    </div>
  `;

  const html = wrapBaseTemplate({ title: subject, previewText, contentHtml });
  const text = `Hello ${name || 'User'},\n\nYour StitchMatch verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nStitchMatch Atelier Team`;

  return { subject, html, text };
}

export function generatePasswordChangedEmail(name: string): { subject: string; html: string; text: string } {
  const subject = `Security Alert: Your StitchMatch Password Has Been Changed`;
  const previewText = `Your StitchMatch account password was successfully updated.`;

  const contentHtml = `
    <h2 style="font-size: 22px; font-weight: 600; color: #ffffff; margin-top: 0;">Password Successfully Changed</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Hello <strong>${name || 'Valued Member'}</strong>,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      This email confirms that the password for your StitchMatch account was updated successfully.
    </p>

    <div class="alert-box" style="border-left-color: #10b981; background-color: #0f1c18;">
      <p class="alert-text" style="color: #a7f3d0;">
        ✔️ If you performed this action, no further steps are required.
      </p>
    </div>

    <p style="font-size: 12px; line-height: 1.6; color: #94a3b8; margin-top: 24px;">
      If you did <strong>not</strong> make this change, please contact platform support or reset your password immediately.
    </p>
  `;

  const html = wrapBaseTemplate({ title: subject, previewText, contentHtml });
  const text = `Hello ${name || 'User'},\n\nYour StitchMatch password has been successfully updated.\n\nIf you did not perform this action, please contact support immediately.\n\nStitchMatch Atelier Team`;

  return { subject, html, text };
}
