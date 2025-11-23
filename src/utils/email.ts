import { APP_BASE_URL } from '../config/constants';

/**
 * Minimal email helper for sending password reset notifications.
 *
 * Configure via environment variables:
 * - SMTP_HOST: SMTP hostname
 * - SMTP_PORT: SMTP port (defaults to 587)
 * - SMTP_USER / SMTP_PASS: optional auth credentials
 * - EMAIL_FROM: from address (defaults to no-reply@example.com)
 *
 * If SMTP is not configured or nodemailer is unavailable in the environment,
 * the function will log a warning and skip sending to avoid failing the flow.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string, name?: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';

  if (!host) {
    console.warn('[email] SMTP not configured. Skipping password reset email send.', { to, resetUrl });
    return;
  }

  try {
    // Lazy load nodemailer so environments without the dependency don't break
    const nodemailer = await import('nodemailer').catch((err) => {
      console.warn('[email] nodemailer not installed. Unable to send password reset email.', err);
      return null as any;
    });

    if (!nodemailer) return;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    const greeting = name ? `Hi ${name},` : 'Hello,';
    const text = [
      greeting,
      '',
      'We received a request to reset the password for your BoulderingELO account.',
      `You can set a new password using the link below (valid for a limited time):`,
      resetUrl,
      '',
      'If you did not request this change, you can safely ignore this email.',
      '',
      'Thanks,',
      'The BoulderingELO Team'
    ].join('\n');

    await transporter.sendMail({
      from,
      to,
      subject: 'Reset your BoulderingELO password',
      text,
    });
  } catch (err) {
    console.error('[email] Failed to send password reset email', err);
  }
}

export function buildResetUrl(token: string) {
  const base = APP_BASE_URL.replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
