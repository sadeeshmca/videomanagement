import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });
}

export function isMailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendInviteEmail(
  toEmail: string,
  tempPassword: string,
  inviterName: string,
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mailer] SMTP not configured, skipping invite email");
    return;
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const appName = process.env.APP_NAME || "Video Management";
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;

  await transporter.sendMail({
    from: `"${appName}" <${from}>`,
    to: toEmail,
    subject: `You've been invited to ${appName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Welcome to ${appName}</h2>
        <p>${inviterName} has invited you as an <strong>Admin</strong>.</p>
        <p>Here are your login credentials:</p>
        <div style="background: #f4f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${toEmail}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p>Please change your password after your first login.</p>
        <a href="${appUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">
          Login Now
        </a>
        <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e5e5;" />
        <p style="color: #888; font-size: 12px;">This is an automated message from ${appName}. Do not reply to this email.</p>
      </div>
    `,
  });

  console.log(`[mailer] Invite email sent to ${toEmail}`);
}
