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
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.IS_RENDER);
  const connTimeout = isRender ? 3500 : 10000;
  const greetTimeout = isRender ? 3500 : 10000;
  const sockTimeout = isRender ? 5000 : 15000;

  if (config.emailService === 'gmail' || config.emailHost?.includes('gmail.com')) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      family: 4,
      connectionTimeout: connTimeout,
      greetingTimeout: greetTimeout,
      socketTimeout: sockTimeout,
      auth: {
        user: config.emailUser,
        pass: config.emailPass,
      },
    });
    return transporter;
  }

  const port = Number(config.emailPort) || 465;
  const isSecure = config.emailSecure !== undefined ? Boolean(config.emailSecure) : (port === 465);

  const transportOptions = {
    host: config.emailHost || 'smtp.gmail.com',
    port,
    secure: isSecure,
    family: 4, // Forces IPv4 DNS resolution
    connectionTimeout: connTimeout,
    greetingTimeout: greetTimeout,
    socketTimeout: sockTimeout,
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
 * Sends email via HTTPS REST API (port 443) to avoid cloud host SMTP port blocking (e.g. Render Free tier)
 */
async function sendViaHttpApi({ to, subject, html, text }) {
  // 1. Resend HTTPS REST API (Port 443)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM || 'Salah Companion <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`[EmailService] Delivered via Resend API to ${to}: ${data.id}`);
        return { success: true, messageId: data.id };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] Resend API rejected (${response.status}): ${errBody}`);
    } catch (err) {
      console.warn(`[EmailService] Resend API attempt failed:`, err.message);
    }
  }

  // 2. Brevo (Sendinblue) HTTPS REST API (Port 443 - 300 free emails/day to any recipient)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const senderEmail = process.env.BREVO_FROM || config.emailUser || 'salahcompanion786@gmail.com';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Salah Companion', email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log(`[EmailService] Delivered via Brevo API to ${to}: ${data.messageId || 'ok'}`);
        return { success: true, messageId: data.messageId || `brevo-${Date.now()}` };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] Brevo API rejected (${response.status}): ${errBody}`);
    } catch (err) {
      console.warn(`[EmailService] Brevo API attempt failed:`, err.message);
    }
  }

  // 3. SendGrid HTTPS REST API (Port 443)
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey) {
    try {
      const senderEmail = process.env.SENDGRID_FROM || config.emailUser || 'salahcompanion786@gmail.com';
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: senderEmail, name: 'Salah Companion' },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });
      if (response.ok || response.status === 202) {
        console.log(`[EmailService] Delivered via SendGrid API to ${to}`);
        return { success: true, messageId: `sendgrid-${Date.now()}` };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] SendGrid API rejected (${response.status}): ${errBody}`);
    } catch (err) {
      console.warn(`[EmailService] SendGrid API attempt failed:`, err.message);
    }
  }

  // 4. Mailgun HTTPS REST API (Port 443)
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  if (mailgunApiKey && mailgunDomain) {
    try {
      const fromEmail = process.env.MAILGUN_FROM || `Salah Companion <mailgun@${mailgunDomain}>`;
      const formData = new URLSearchParams();
      formData.append('from', fromEmail);
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('html', html);
      formData.append('text', text);
      const auth = Buffer.from(`api:${mailgunApiKey}`).toString('base64');
      const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`[EmailService] Delivered via Mailgun API to ${to}: ${data.id}`);
        return { success: true, messageId: data.id };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] Mailgun API rejected (${response.status}): ${errBody}`);
    } catch (err) {
      console.warn(`[EmailService] Mailgun API attempt failed:`, err.message);
    }
  }

  return null;
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
          <a href="${verificationUrl}" class="btn" target="_blank">Verify My Email &amp; Launch Dashboard</a>
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
          If the button above does not work, copy and paste this verification URL into your browser:<br>
          <a href="${verificationUrl}" target="_blank">${verificationUrl}</a>
          <br><br>
          Alternative direct API link:<br>
          <a href="${directApiUrl}" target="_blank">${directApiUrl}</a>
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
export async function sendVerificationEmail(to, name, token, clientOrigin = null) {
  let frontendBase = 'https://salah-companion.mdsaif.workers.dev';
  if (clientOrigin) {
    const sanitized = clientOrigin.replace('salahcopmanion', 'salahcompanion').replace(/\/+$/, '');
    if (sanitized.includes('workers.dev') || sanitized.includes('localhost')) {
      frontendBase = sanitized;
    }
  } else if (config.frontendUrl && !config.frontendUrl.includes('netlify.app')) {
    frontendBase = config.frontendUrl.replace('salahcopmanion', 'salahcompanion').replace(/\/+$/, '');
  }

  if (frontendBase.includes('netlify.app')) {
    frontendBase = 'https://salah-companion.mdsaif.workers.dev';
  }

  const directApiUrl = `${config.appUrl}/api/auth/verify-email?token=${token}`;
  const verificationUrl = `${frontendBase}/verify-email?token=${token}`;

  const htmlContent = getVerificationEmailHtml(name, verificationUrl, directApiUrl);
  const textContent = `Assalamu Alaikum ${name},\n\nPlease verify your email and activate your Salah Companion account by clicking this link:\n${verificationUrl}\n\nThis will take you to your Salah Companion dashboard.\n\nAlternative direct verification link:\n${directApiUrl}\n\nThis link will expire in ${config.verificationTokenTtlHours} hours.\n\nSalah Companion Team`;

  const mailOptions = {
    from: config.emailFrom || `"Salah Companion" <${config.emailUser}>`,
    to,
    replyTo: config.emailUser || 'salahcompanion786@gmail.com',
    subject: 'Verify your email address - Salah Companion',
    text: textContent,
    html: htmlContent,
    headers: {
      'X-Entity-Ref-ID': token,
    },
  };

  try {
    // 1. First attempt HTTPS REST API if configured (bypasses Render SMTP port blocking)
    const httpApiResult = await sendViaHttpApi({
      to,
      subject: 'Verify your email address - Salah Companion',
      html: htmlContent,
      text: textContent,
    });
    if (httpApiResult?.success) {
      return {
        success: true,
        messageId: httpApiResult.messageId,
        previewUrl: verificationUrl,
        verificationUrl,
      };
    }

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

    const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.IS_RENDER);

    // If primary port failed on Gmail and not running on Render (where all outbound SMTP ports are blocked)
    if (!isRender && (config.emailHost?.includes('gmail.com') || config.emailService === 'gmail' || !config.emailHost)) {
      try {
        const primaryPort = Number(config.emailPort) || 465;
        const fallbackPort = primaryPort === 465 ? 587 : 465;
        console.log(`[EmailService] Retrying via fallback Gmail port ${fallbackPort} (IPv4)...`);
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: fallbackPort,
          secure: fallbackPort === 465,
          family: 4,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
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
    if (isRender && (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT') || err.message?.includes('ESOCKETTIMEDOUT'))) {
      friendlyError = 'Mail server connection timeout. Cloud host (Render) restricts outbound SMTP ports (465/587). Please configure BREVO_API_KEY or RESEND_API_KEY in Render Environment Variables.';
    } else if (err.message?.includes('535') || err.message?.includes('BadCredentials')) {
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
  if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY || process.env.MAILGUN_API_KEY) {
    let provider = 'http_api';
    if (process.env.BREVO_API_KEY) provider = 'brevo_http_api';
    else if (process.env.RESEND_API_KEY) provider = 'resend_http_api';
    else if (process.env.SENDGRID_API_KEY) provider = 'sendgrid_http_api';
    else if (process.env.MAILGUN_API_KEY) provider = 'mailgun_http_api';
    return {
      connected: true,
      provider,
    };
  }

  const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.IS_RENDER);
  if (isRender) {
    return {
      connected: false,
      error: 'Render Free Tier blocks raw outbound SMTP ports (25, 465, 587). Please configure BREVO_API_KEY or RESEND_API_KEY in Render Environment Variables to enable transactional email delivery via HTTPS (port 443).',
      provider: config.emailService,
    };
  }

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
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
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

/**
 * Generates responsive Islamic-themed password reset email HTML template
 */
function getPasswordResetEmailHtml(name, resetUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Salah Companion</title>
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
      <div class="header">
        <div class="header-icon">🕌</div>
        <h1 class="header-title">Salah Companion</h1>
        <div class="header-subtitle">رفیقِ نماز • Account Security</div>
      </div>
      <div class="content">
        <div class="greeting">Assalamu Alaikum wa Rahmatullah, ${name || 'Dear Brother/Sister'}!</div>
        <div class="text">
          We received a request to reset your password for your <strong>Salah Companion</strong> account.
        </div>
        <div class="text">
          Click the button below to choose a new secure password:
        </div>
        <div class="btn-container">
          <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
        </div>
        <div class="info-card">
          ⏱️ <strong>Security Notice:</strong> This reset link is valid for <strong>1 hour</strong> and can only be used once. If you did not request a password reset, you can safely ignore this email — your existing password remains completely secure.
        </div>
        <div class="backup-link">
          If the button above does not work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Salah Companion. May Allah protect your iman and guide your steps.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends a password reset email to the user
 * @param {string} to Recipient email
 * @param {string} name Recipient name
 * @param {string} token Password reset token
 * @param {string|null} clientOrigin Client origin domain
 */
export async function sendPasswordResetEmail(to, name, token, clientOrigin = null) {
  let frontendBase = 'https://salah-companion.mdsaif.workers.dev';
  if (clientOrigin) {
    const sanitized = clientOrigin.replace('salahcopmanion', 'salahcompanion').replace(/\/+$/, '');
    if (sanitized.includes('workers.dev') || sanitized.includes('localhost')) {
      frontendBase = sanitized;
    }
  } else if (config.frontendUrl && !config.frontendUrl.includes('netlify.app')) {
    frontendBase = config.frontendUrl.replace('salahcopmanion', 'salahcompanion').replace(/\/+$/, '');
  }

  if (frontendBase.includes('netlify.app')) {
    frontendBase = 'https://salah-companion.mdsaif.workers.dev';
  }

  const resetUrl = `${frontendBase}/reset-password?token=${token}`;
  const htmlContent = getPasswordResetEmailHtml(name, resetUrl);
  const textContent = `Assalamu Alaikum ${name},\n\nWe received a request to reset your password for your Salah Companion account.\n\nPlease click the link below to choose a new password:\n${resetUrl}\n\nThis reset link is valid for 1 hour.\n\nIf you did not request a password reset, you can safely ignore this email.\n\nSalah Companion Team`;

  const mailOptions = {
    from: config.emailFrom || `"Salah Companion" <${config.emailUser}>`,
    to,
    replyTo: config.emailUser || 'salahcompanion786@gmail.com',
    subject: 'Reset your password - Salah Companion',
    text: textContent,
    html: htmlContent,
    headers: {
      'X-Entity-Ref-ID': token,
    },
  };

  try {
    // 1. First attempt HTTPS REST API if configured (bypasses Render SMTP port blocking)
    const httpApiResult = await sendViaHttpApi({
      to,
      subject: 'Reset your password - Salah Companion',
      html: htmlContent,
      text: textContent,
    });
    if (httpApiResult?.success) {
      return {
        success: true,
        messageId: httpApiResult.messageId,
        resetUrl,
        previewUrl: resetUrl,
      };
    }

    const mailer = await getTransporter();
    const info = await mailer.sendMail(mailOptions);
    console.log(`[EmailService] Password reset email successfully sent to ${to}: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info) || resetUrl;

    return {
      success: true,
      messageId: info.messageId,
      resetUrl,
      previewUrl,
    };
  } catch (err) {
    console.error(`[EmailService] Primary SMTP delivery failed for password reset to ${to}:`, err.message);

    const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.IS_RENDER);

    // Fallback port retry if Gmail and not on Render
    if (!isRender && (config.emailHost?.includes('gmail.com') || config.emailService === 'gmail' || !config.emailHost)) {
      try {
        const primaryPort = Number(config.emailPort) || 465;
        const fallbackPort = primaryPort === 465 ? 587 : 465;
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: fallbackPort,
          secure: fallbackPort === 465,
          family: 4,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
          auth: {
            user: config.emailUser,
            pass: config.emailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[EmailService] Reset email successfully sent via fallback port ${fallbackPort} to ${to}: ${info.messageId}`);
        return {
          success: true,
          messageId: info.messageId,
          resetUrl,
          previewUrl: resetUrl,
        };
      } catch (fallbackErr) {
        console.error(`[EmailService] Fallback reset delivery failed:`, fallbackErr.message);
      }
    }

    let friendlyError = err.message;
    if (isRender && (err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT') || err.message?.includes('ESOCKETTIMEDOUT'))) {
      friendlyError = 'Mail server connection timeout. Cloud host (Render) restricts outbound SMTP ports (465/587). Please configure BREVO_API_KEY or RESEND_API_KEY in Render Environment Variables.';
    } else if (err.message?.includes('535') || err.message?.includes('BadCredentials')) {
      friendlyError = 'Gmail SMTP authentication rejected. Gmail requires a 16-character App Password (not your personal account password). Please generate an App Password at Google Account > Security > 2-Step Verification > App passwords.';
    }

    return {
      success: false,
      error: friendlyError,
      resetUrl,
      previewUrl: resetUrl,
    };
  }
}

