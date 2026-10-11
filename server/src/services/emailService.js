import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter = null;

/**
 * Initializes and returns the Nodemailer transporter
 */
async function getTransporter() {
  if (transporter) return transporter;

  // 1. If explicitly configured for Ethereal test SMTP (e.g. for testing or fallback)
  if (config.emailService === 'ethereal' || process.env.SMTP_PROVIDER === 'ethereal') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[EmailService] Initialized Ethereal test SMTP user: ${testAccount.user}`);
    return transporter;
  }

  // 2. Production / Configured SMTP (Gmail, SendGrid, Amazon SES, Brevo, or custom SMTP)
  const port = Number(config.emailPort) || 465;
  const isSecure = config.emailSecure !== undefined ? Boolean(config.emailSecure) : (port === 465);

  const transportOptions = {
    host: config.emailHost || 'smtp.gmail.com',
    port,
    secure: isSecure,
    family: 4, // CRITICAL: Forces IPv4 DNS resolution to prevent ENETUNREACH errors on cloud hosts like Render
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  transporter = nodemailer.createTransport(transportOptions);
  return transporter;
}

/**
 * Generates the responsive Islamic-themed verification email HTML template
 */
function getVerificationEmailHtml(name, verificationUrl, directApiUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Salah Companion</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F5EE;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2D26;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F5EE;
      padding: 30px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #ECE7DB;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }
    .header {
      background: linear-gradient(135deg, #0E543F 0%, #157357 100%);
      padding: 36px 30px 30px;
      text-align: center;
      color: #FFFFFF;
    }
    .header-icon {
      font-size: 32px;
      margin-bottom: 8px;
      display: inline-block;
    }
    .header-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .header-subtitle {
      font-size: 13px;
      color: #C5E5D7;
      margin-top: 4px;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px 28px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 17px;
      font-weight: 700;
      color: #142820;
      margin-bottom: 14px;
    }
    .text {
      font-size: 14.5px;
      color: #4A5B52;
      margin-bottom: 22px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 28px;
    }
    .btn {
      display: inline-block;
      background-color: #0E543F;
      color: #FFFFFF !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 34px;
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(14, 84, 63, 0.25);
    }
    .info-card {
      background-color: #FAF8F2;
      border: 1px solid #ECE7DB;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #5C6E65;
    }
    .backup-link {
      font-size: 12px;
      color: #7A8B82;
      word-break: break-all;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed #E2DDD2;
    }
    .backup-link a {
      color: #0E543F;
      text-decoration: underline;
    }
    .quote-box {
      border-left: 3px solid #D97706;
      background-color: #FFFBEB;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 24px 0 10px;
      font-size: 12.5px;
      color: #92400E;
      font-style: italic;
    }
    .footer {
      background-color: #FAF8F2;
      padding: 22px 30px;
      text-align: center;
      border-top: 1px solid #EFEAE0;
      font-size: 11.5px;
      color: #8A9991;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="header-icon">🕌</div>
        <h1 class="header-title">Salah Companion</h1>
        <div class="header-subtitle">رفیقِ نماز • Prayer & Spiritual Tracker</div>
      </div>

      <!-- Content -->
      <div class="content">
        <div class="greeting">Assalamu Alaikum wa Rahmatullah, ${name || 'Dear Brother/Sister'}!</div>
        <div class="text">
          JazakAllahu Khair for registering with <strong>Salah Companion</strong>. We are honored to accompany you on your daily prayer journey.
        </div>
        <div class="text">
          To activate your account and start tracking your prayers on time, please verify your email address by clicking the button below:
        </div>

        <!-- Button -->
        <div class="btn-container">
          <a href="${directApiUrl}" class="btn" target="_blank">Verify My Email &amp; Launch Dashboard</a>
        </div>

        <div class="info-card">
          ⏱️ <strong>Link Expiry:</strong> This verification link is valid for <strong>24 hours</strong>. Clicking it activates your account and automatically logs you in.
        </div>

        <div class="quote-box">
          ”Establish prayer, for prayer restrains from shameful and unjust deeds.“
          <br><strong style="font-style: normal; font-size: 11px;">— Surah Al-Ankabut (29:45)</strong>
        </div>

        <!-- Fallback Link -->
        <div class="backup-link">
          If the button above does not work, copy and paste this URL into your browser:<br>
          <a href="${directApiUrl}" target="_blank">${directApiUrl}</a>
          <br><br>
          Or verify via client app:<br>
          <a href="${verificationUrl}" target="_blank">${verificationUrl}</a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        If you did not create an account on Salah Companion, you can safely ignore this email.<br>
        © ${new Date().getFullYear()} Salah Companion. May Allah accept your prayers and deeds.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends an email verification email to the user
 * @param {string} to Recipient email
 * @param {string} name Recipient name
 * @param {string} token Verification hex token
 */
export async function sendVerificationEmail(to, name, token) {
  const directApiUrl = `${config.appUrl}/api/auth/verify-email?token=${token}`;
  const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

  const htmlContent = getVerificationEmailHtml(name, verificationUrl, directApiUrl);
  const textContent = `Assalamu Alaikum ${name},\n\nPlease verify your email and activate your Salah Companion account by clicking this link:\n${directApiUrl}\n\nThis will automatically log you into your account and take you directly to your prayer dashboard.\n\nThis link will expire in ${config.verificationTokenTtlHours} hours.\n\nSalah Companion Team`;

  try {
    const mailOptions = {
      from: config.emailFrom,
      to,
      subject: '🕌 Verify your email address - Salah Companion',
      text: textContent,
      html: htmlContent,
    };

    const mailer = await getTransporter();
    const info = await mailer.sendMail(mailOptions);
    console.log(`[EmailService] Verification email successfully sent to ${to}: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info) || verificationUrl;

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      verificationUrl,
    };
  } catch (err) {
    console.error(`[EmailService] Primary SMTP delivery failed for ${to}:`, err.message);

    // If primary port failed on Gmail, attempt fallback port (465 <-> 587) with family: 4
    if (config.emailHost?.includes('gmail.com') || config.emailService === 'gmail' || !config.emailHost) {
      try {
        const primaryPort = Number(config.emailPort) || 465;
        const fallbackPort = primaryPort === 465 ? 587 : 465;
        console.log(`[EmailService] Retrying via fallback Gmail port ${fallbackPort} (IPv4)...`);
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: fallbackPort,
          secure: fallbackPort === 465,
          family: 4,
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 10000,
          auth: {
            user: config.emailUser,
            pass: config.emailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[EmailService] Verification email successfully sent via fallback port ${fallbackPort} to ${to}: ${info.messageId}`);
        transporter = fallbackTransporter;
        return {
          success: true,
          messageId: info.messageId,
          previewUrl: verificationUrl,
          verificationUrl,
        };
      } catch (fallbackErr) {
        console.error(`[EmailService] Fallback port delivery also failed:`, fallbackErr.message);
      }
    }

    let friendlyError = err.message;
    if (err.message?.includes('535') || err.message?.includes('BadCredentials')) {
      friendlyError = 'Gmail SMTP authentication rejected. Gmail requires a 16-character App Password (not your personal account password). Please generate an App Password at Google Account > Security > 2-Step Verification > App passwords.';
    }

    return {
      success: false,
      error: friendlyError,
      previewUrl: verificationUrl,
      verificationUrl,
    };
  }
}

/**
 * Verifies SMTP transport configuration connection
 */
export async function verifyEmailTransport() {
  try {
    const mailer = await getTransporter();
    await mailer.verify();
    return { connected: true };
  } catch (err) {
    console.warn(`[EmailService] Primary transport verification failed: ${err.message}. Trying port 587 fallback...`);
    try {
      const fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        auth: {
          user: config.emailUser,
          pass: config.emailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      await fallbackTransporter.verify();
      transporter = fallbackTransporter;
      return { connected: true, fallbackUsed: true };
    } catch (fallbackErr) {
      let friendlyError = fallbackErr.message;
      if (fallbackErr.message?.includes('535') || fallbackErr.message?.includes('BadCredentials')) {
        friendlyError = 'Gmail SMTP authentication rejected. Gmail requires a 16-character App Password (not your personal account password). Please generate an App Password at Google Account > Security > 2-Step Verification > App passwords.';
      }
      return { connected: false, error: friendlyError };
    }
  }
}
