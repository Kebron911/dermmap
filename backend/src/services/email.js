/**
 * Email service for transactional messages (password reset, etc.)
 *
 * Required environment variables:
 *   SMTP_HOST     — SMTP server hostname
 *   SMTP_PORT     — SMTP port (defaults to 587 STARTTLS)
 *   SMTP_SECURE   — "true" for port 465 / implicit TLS; omit for STARTTLS
 *   SMTP_USER     — SMTP auth username
 *   SMTP_PASS     — SMTP auth password
 *   EMAIL_FROM    — "From" address, e.g. "DermMap <no-reply@dermmap.com>"
 */
import nodemailer from 'nodemailer';

// Create a single shared transporter. Configuration is driven entirely by
// environment variables so no credentials are baked into source code.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true = TLS on port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'DermMap <no-reply@dermmap.com>';

/**
 * Send a password-reset link.
 * The token must already be hashed before storage; only the raw token is put
 * in the URL so it travels over HTTPS and never touches DB logs.
 */
export async function sendPasswordResetEmail(recipientEmail, resetToken) {
  const appBase = process.env.APP_BASE_URL || 'https://app.dermmap.com';
  const link = `${appBase}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: FROM,
    to: recipientEmail,
    subject: 'DermMap — Password Reset Request',
    text: `You requested a password reset.\n\nClick the link below to choose a new password (valid for 1 hour):\n\n${link}\n\nIf you did not request this, ignore this email — your password will not change.`,
    html: `<p>You requested a password reset.</p>
<p><a href="${link}" style="font-weight:bold">Reset my password</a></p>
<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  });
}
