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

// ── Expiry Reminder ──────────────────────────────────────────

const EXPIRY_REMINDER_TEMPLATE = (
  name: string,
  tier: string,
  expiryDate: string,
  daysRemaining: number
): { subject: string; html: string } => {
  const tierLabel = tier === 'monthly' ? '月度会员' : '年度会员';
  return {
    subject: `您的${tierLabel}将在${daysRemaining}天后到期`,
    html: `
      <h2>您好${name}，您的订阅即将到期</h2>
      <p>您的<b>${tierLabel}</b>将在 <b>${daysRemaining}天后</b>（${expiryDate}）到期。</p>
      <p>为避免影响您的学习，请及时续费或购买兑换码兑换。</p>
      <p><a href="${process.env.NEXT_PUBLIC_PURCHASE_URL || '#'}">立即购买</a></p>
      <p>感谢您选择 KIP 智能学习平台！</p>
    `,
  };
};

interface ExpiryReminderUser {
  email: string;
  name: string;
  tier?: string;
  subscriptionExpiresAt?: string;
}

export async function sendExpiryReminder(
  user: ExpiryReminderUser,
  daysRemaining: number
): Promise<{ sent: boolean; reason?: string }> {
  // Skip deleted/anonymized users
  if (!user.email || user.email.startsWith('deleted-')) {
    return { sent: false, reason: 'deleted_or_anonymized_user' };
  }

  const tier = user.tier || 'free';
  if (tier === 'free') {
    return { sent: false, reason: 'free_tier' };
  }

  const expiryDate = user.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : '未知';
  const displayName = user.name || '用户';

  const { subject, html } = EXPIRY_REMINDER_TEMPLATE(
    displayName,
    tier,
    expiryDate,
    daysRemaining
  );

  if (!SMTP_USER || !SMTP_PASS) {
    console.log(
      `[EmailService] SMTP not configured — DEV MODE. Expiry reminder for ${user.email}: ${daysRemaining} days, tier=${tier}`
    );
    return { sent: false, reason: 'no_smtp_config' };
  }

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
      to: user.email,
      subject,
      html,
    });

    console.log(
      `[EmailService] Expiry reminder sent to ${user.email} (${daysRemaining} days remaining)`
    );
    return { sent: true };
  } catch (err) {
    console.error('[EmailService] Expiry reminder send failed:', err);
    return { sent: false, reason: 'smtp_error' };
  }
}

export const emailService = {
  sendVerificationEmail,
  sendExpiryReminder,
};

export default emailService;
