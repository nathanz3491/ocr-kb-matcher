import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.SMTP_FROM || 'kip-app@outlook.com';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'KIP';

const getEmailTemplate = (greeting: string, code: string): string => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Verify your email — KIP</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles for email clients */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 30px 20px !important; }
      .header-padding { padding: 40px 20px !important; }
      .code-text { font-size: 32px !important; letter-spacing: 6px !important; }
      .heading-text { font-size: 26px !important; }
    }
    @media only screen and (max-width: 400px) {
      .code-text { font-size: 28px !important; letter-spacing: 4px !important; }
      .heading-text { font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Outer Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Main Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <!-- Header Section with Gradient -->
          <tr>
            <td align="center" class="header-padding" style="padding: 50px 40px; background: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 50%, #1a1a2e 100%); text-align: center;">
              <!-- Logo/Icon Area -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="width: 64px; height: 64px; background: rgba(255, 255, 255, 0.15); border-radius: 16px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 32px; color: #ffffff; font-weight: bold;">K</span>
                  </td>
                </tr>
              </table>
              <!-- Brand Name -->
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: rgba(255, 255, 255, 0.7); letter-spacing: 2px; text-transform: uppercase;">Knowledge Intelligence Platform</p>
              <!-- Main Heading -->
              <h1 class="heading-text" style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; line-height: 1.2;">Verify Your Email</h1>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td class="content-padding" style="padding: 50px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1e3a5f; line-height: 1.5;">${greeting},</p>
              
              <!-- Body Text -->
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #4a5568; line-height: 1.7;">Thank you for registering with <strong style="color: #1e3a5f;">KIP</strong>. Please verify your email address by entering the code below:</p>
              
              <!-- Verification Code Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 35px 0;">
                <tr>
                  <td align="center">
                    <!-- Code Container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; border: 2px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 28px 40px; text-align: center;">
                          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">Verification Code</p>
                          <p class="code-text" style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 700; color: #1e3a5f; letter-spacing: 10px; line-height: 1;">${code}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 16px 20px; background-color: #fff7ed; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
                      <span style="font-weight: 600;">⏱ This code expires in 15 minutes.</span><br/>
                      For security reasons, please use this code promptly.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Security Note -->
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.6; font-style: italic;">If you didn't request this email, you can safely ignore it. No changes have been made to your account.</p>
              
            </td>
          </tr>
          
          <!-- Footer Section -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <!-- Brand Footer -->
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1e3a5f;">KIP</p>
              <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; letter-spacing: 0.5px;">Knowledge Intelligence Platform</p>
              
              <!-- Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                <tr>
                  <td style="border-top: 1px solid #e2e8f0;"></td>
                </tr>
              </table>
              
              <!-- Website Link -->
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                <a href="https://basischina.com" style="color: #64748b; text-decoration: none; font-weight: 500;">basischina.com</a>
              </p>
              
              <!-- Copyright -->
              <p style="margin: 15px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This email was sent to you as part of your registration with KIP.<br/>
                © ${new Date().getFullYear()} KIP. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        <!-- End Main Email Container -->
        
      </td>
    </tr>
  </table>
  <!-- End Outer Container -->
  
</body>
</html>`;

const getPlainTextTemplate = (greeting: string, code: string): string => `KIP — Knowledge Intelligence Platform
=====================================

Verify Your Email

${greeting},

Thank you for registering with KIP. Please verify your email address by entering the code below:

VERIFICATION CODE: ${code}

This code expires in 15 minutes.

If you didn't request this email, you can safely ignore it.

---
KIP — Knowledge Intelligence Platform
basischina.com`;

async function sendVerificationEmailViaBrevo(
  email: string,
  code: string,
  name?: string
): Promise<void> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log(`[EmailService] SMTP credentials not configured — DEV MODE. Code for ${email}: ${code}`);
    return;
  }

  const greeting = name ? `Hello ${name}` : 'Hello';
  const htmlContent = getEmailTemplate(greeting, code);
  const textContent = getPlainTextTemplate(greeting, code);

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Verify your email — KIP',
      html: htmlContent,
      text: textContent,
    });

    console.log(`[EmailService] Verification email sent to ${email} via Brevo SMTP`);
  } catch (err) {
    console.error('[EmailService] Brevo SMTP error:', err);
    console.log(`[EmailService] DEV MODE fallback — Code for ${email}: ${code}`);
  }
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  name?: string
): Promise<void> {
  await sendVerificationEmailViaBrevo(email, code, name);
}

export const emailService = {
  sendVerificationEmail,
};

export default emailService;



async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; messageId?: string }> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[EmailService] SMTP not configured — DEV MODE. Would send to ' + to + ': ' + subject);
    return { success: false };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from: FROM_NAME + ' <' + FROM_EMAIL + '>',
      to,
      subject,
      html,
      text,
    });
    console.log('[EmailService] Email sent to ' + to + ': ' + subject);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EmailService] Failed to send to ' + to + ': ' + subject, err);
    return { success: false };
  }
}
// ===== Parent Alert & Digest Emails =====

/**
 * Send a real-time parent alert email (used for critical signals).
 */
export async function sendParentAlertEmail(
  parentEmail: string,
  parentName: string,
  alert: {
    type: string;
    severity: string;
    studentName: string;
    message: string;
    createdAt: string;
  }
): Promise<{ success: boolean; messageId?: string }> {
  if (!parentEmail || parentEmail.trim() === '') {
    console.warn('[EmailService] Skipping parent alert email — empty parentEmail');
    return { success: false };
  }

  const severityColor = alert.severity === 'critical' ? '#ef4444' : '#f59e0b';
  const severityLabel = alert.severity === 'critical' ? 'Critical' : 'Warning';
  const timeAgo = formatTimeAgo(alert.createdAt);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Parent Alert — KIP</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">KIP — Knowledge Intelligence Platform</h1>
              <p style="margin:4px 0 0;color:#e0e7ff;font-size:14px;">Parent Alert</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hello <strong>${escapeHtml(parentName)}</strong>,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">We'd like to bring something to your attention regarding ${escapeHtml(alert.studentName)}.</p>
              
              <!-- Alert Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="display:inline-block;background:${severityColor};color:#ffffff;font-size:12px;font-weight:bold;padding:4px 10px;border-radius:12px;">${severityLabel}</span>
                          <span style="display:inline-block;margin-left:8px;font-size:12px;color:#6b7280;text-transform:uppercase;">${escapeHtml(alert.type.replace('_', ' '))}</span>
                        </td>
                        <td align="right" style="font-size:12px;color:#9ca3af;">${timeAgo}</td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;font-size:14px;color:#374151;">${escapeHtml(alert.message)}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Visit your parent dashboard to review and manage alerts.</p>
              
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:6px;">
                    <a href="https://mastri.app/parent-monitor" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">View Parent Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;">
                You received this because your account is linked to a student on KIP.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                <a href="https://mastri.app/settings?unsubscribe=${encodeURIComponent(parentEmail)}" style="color:#6b7280;">Unsubscribe from alerts</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hello ${parentName},\n\nAlert for ${alert.studentName}: ${alert.message}\n\nVisit https://mastri.app/parent-monitor to review.\n\nUnsubscribe: https://mastri.app/settings?unsubscribe=${encodeURIComponent(parentEmail)}`;

  return sendEmail(parentEmail, `Alert: ${alert.studentName} — ${alert.type.replace('_', ' ')}`, html, text);
}

/**
 * Send a daily digest email to a parent.
 */
export async function sendParentDigestEmail(
  parentEmail: string,
  parentName: string,
  students: Array<{
    studentId: string;
    studentName: string;
    triggeredAlerts: Array<{ type: string; severity: string; message: string; createdAt: string; studentName: string }>;
    stats: {
      reviewsDue: number;
      lastQuizDate?: string;
      lastActivityDate?: string;
    };
  }>
): Promise<{ success: boolean; messageId?: string }> {
  if (!parentEmail || parentEmail.trim() === '') {
    console.warn('[EmailService] Skipping digest email — empty parentEmail');
    return { success: false };
  }

  const studentsWithAlerts = students.filter(s => s.triggeredAlerts.length > 0);

  // If no alerts, still send a positive digest email
  const studentCardsHtml = students.map(student => {
    const alertRows = student.triggeredAlerts.map(alert => {
      const color = alert.severity === 'critical' ? '#ef4444' : '#f59e0b';
      const label = alert.severity === 'critical' ? 'Critical' : 'Warning';
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
            <span style="display:inline-block;background:${color};color:#ffffff;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:10px;margin-right:8px;">${label}</span>
            <span style="font-size:13px;color:#374151;">${escapeHtml(alert.message)}</span>
          </td>
        </tr>`;
    }).join('');

    const noAlertMsg = student.triggeredAlerts.length === 0
      ? '<span style="color:#10b981;font-size:13px;">On track</span>'
      : '';

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;overflow:hidden;">
        <tr>
          <td style="background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;">
            <strong style="font-size:15px;color:#111827;">${escapeHtml(student.studentName)}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;">
            ${noAlertMsg}
            <table width="100%" cellpadding="0" cellspacing="0">
              ${alertRows}
            </table>
            ${student.stats.reviewsDue > 0 ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Reviews due: ${student.stats.reviewsDue}</p>` : ''}
          </td>
        </tr>
      </table>`;
  }).join('');

  const allOnTrack = studentsWithAlerts.length === 0;
  const summaryColor = allOnTrack ? '#10b981' : '#f59e0b';
  const summaryText = allOnTrack
    ? 'Great news — all your students are on track today!'
    : `${studentsWithAlerts.length} of ${students.length} student(s) have alerts that need attention.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Digest — KIP</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">KIP — Daily Parent Digest</h1>
              <p style="margin:4px 0 0;color:#e0e7ff;font-size:14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hello <strong>${escapeHtml(parentName)}</strong>,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${summaryText}</p>
              
              ${studentCardsHtml}
              
              <table cellpadding="0" cellspacing="0" style="margin-top:8px;">
                <tr>
                  <td style="background:#4f46e5;border-radius:6px;">
                    <a href="https://mastri.app/parent-monitor" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">View Full Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;">
                You're receiving this because your account is linked to student(s) on KIP.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                <a href="https://mastri.app/settings?unsubscribe=${encodeURIComponent(parentEmail)}" style="color:#6b7280;">Unsubscribe from daily digest</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hello ${parentName},\n\n${summaryText}\n\n${students.map(s => `${s.studentName}: ${s.triggeredAlerts.length} alert(s), ${s.stats.reviewsDue} reviews due`).join('\n')}\n\nVisit https://mastri.app/parent-monitor\n\nUnsubscribe: https://mastri.app/settings?unsubscribe=${encodeURIComponent(parentEmail)}`;

  return sendEmail(parentEmail, `KIP Daily Digest — ${new Date().toLocaleDateString()}`, html, text);
}

// Helper: escape HTML entities
function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper: format relative time
function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day(s) ago`;
  if (hours > 0) return `${hours} hour(s) ago`;
  return 'Just now';
}
