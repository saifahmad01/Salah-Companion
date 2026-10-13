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

let lastHttpApiError = null;

/**
 * Sends email via HTTPS REST API (port 443) to avoid cloud host SMTP port blocking (e.g. Render Free tier)
 *
 * Priority order:
 *  1. Brevo  — FREE 300 emails/day, any recipient, no custom domain needed
 *  2. Resend — FREE but requires verified domain for non-owner recipients
 *  3. SendGrid — FREE tier 100/day
 *  4. Mailgun — FREE tier 1000/month
 */
async function sendViaHttpApi({ to, subject, html, text }) {
  lastHttpApiError = null;

  // ── 1. Brevo (Sendinblue) ─────────────────────────────────────────────────
  // 300 free emails/day, sends to ANY email, no custom domain required.
  // Sign up free at brevo.com → Settings → SMTP & API → Create API Key
  // Set env: BREVO_API_KEY + BREVO_FROM (optional, defaults to EMAIL_USER)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const senderEmail = process.env.BREVO_FROM || config.emailUser || 'salahcompanion786@gmail.com';
      const senderName  = process.env.BREVO_SENDER_NAME || 'Salah Companion';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log(`[EmailService] ✅ Delivered via Brevo to ${to}: ${data.messageId || 'ok'}`);
        return { success: true, messageId: data.messageId || `brevo-${Date.now()}`, provider: 'brevo' };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] Brevo rejected (${response.status}): ${errBody}`);
      lastHttpApiError = `Brevo (${response.status}): ${errBody}`;
    } catch (err) {
      console.warn(`[EmailService] Brevo failed:`, err.message);
      lastHttpApiError = `Brevo: ${err.message}`;
    }
  }

  // ── 2. Resend ─────────────────────────────────────────────────────────────
  // Free plan only sends to verified domain emails. To send to any user,
  // verify a domain at resend.com/domains and set RESEND_FROM accordingly.
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
        body: JSON.stringify({ from: fromEmail, to: [to], subject, html, text }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`[EmailService] ✅ Delivered via Resend to ${to}: ${data.id}`);
        return { success: true, messageId: data.id, provider: 'resend' };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] Resend rejected (${response.status}): ${errBody}`);
      lastHttpApiError = `Resend (${response.status}): ${errBody}`;
    } catch (err) {
      console.warn(`[EmailService] Resend failed:`, err.message);
      lastHttpApiError = `Resend: ${err.message}`;
    }
  }

  // ── 3. SendGrid ───────────────────────────────────────────────────────────
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
        console.log(`[EmailService] ✅ Delivered via SendGrid to ${to}`);
        return { success: true, messageId: `sendgrid-${Date.now()}`, provider: 'sendgrid' };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] SendGrid rejected (${response.status}): ${errBody}`);
      lastHttpApiError = `SendGrid (${response.status}): ${errBody}`;
    } catch (err) {
      console.warn(`[EmailService] SendGrid failed:`, err.message);
      lastHttpApiError = `SendGrid: ${err.message}`;
    }
  }

  // ── 4. Mailgun ────────────────────────────────────────────────────────────
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
        console.log(`[EmailService] ✅ Delivered via Mailgun to ${to}: ${data.id}`);
        return { success: true, messageId: data.id, provider: 'mailgun' };
      }
      const errBody = await response.text();
      console.warn(`[EmailService] Mailgun API rejected (${response.status}): ${errBody}`);
      lastHttpApiError = `Mailgun API rejected (${response.status}): ${errBody}`;
    } catch (err) {
      console.warn(`[EmailService] Mailgun API attempt failed:`, err.message);
      lastHttpApiError = `Mailgun connection failed: ${err.message}`;
    }
  }

  return null;
}

/**
 * Generates the responsive Islamic-themed OTP verification email HTML template
 * Styled with bulletproof inline CSS for Gmail (Android/iOS), Apple Mail, Outlook, and webmail clients.
 */
function getOtpEmailHtml(name, otp) {
  const currentYear = new Date().getFullYear();
  const recipientGreeting = name ? name.trim() : 'Dear Brother/Sister';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Salah Companion Verification Code</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #F4F1EA; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .header-padding { padding: 30px 18px 24px !important; }
      .content-padding { padding: 26px 18px 20px !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 8px !important; padding-left: 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2D26; -webkit-font-smoothing: antialiased;">
  <!-- Outer Wrapper Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F1EA; width: 100%; margin: 0; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E6E0D2; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
          
          <!-- Islamic Emerald Header -->
          <tr>
            <td class="header-padding" align="center" style="background-color: #0C4535; background: linear-gradient(135deg, #061F17 0%, #0C4535 60%, #13614B 100%); padding: 36px 24px 30px; text-align: center; color: #FFFFFF;">
              <!-- Mosque Icon -->
              <div style="font-size: 38px; line-height: 1; margin-bottom: 8px;">🕌</div>
              <!-- App Title -->
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">Salah Companion</h1>
              <!-- Arabic Calligraphy Title -->
              <div style="font-size: 16px; color: #E5C67F; font-weight: 600; margin-top: 5px; font-family: 'Traditional Arabic', 'Scheherazade New', serif;">رفیقِ نماز</div>
              <!-- Subtitle Badge -->
              <div style="font-size: 11px; color: #C5E5D7; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; font-weight: 600;">Verification Code • رمز التحقق</div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-padding" style="padding: 32px 28px 24px; line-height: 1.6; color: #1F2D26;">
              <!-- Bismillah Banner -->
              <div style="text-align: center; font-size: 15px; color: #B58728; margin-bottom: 18px; font-weight: 600; font-family: 'Traditional Arabic', 'Scheherazade New', serif; letter-spacing: 1px;">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>

              <!-- Greeting -->
              <div style="font-size: 17px; font-weight: 700; color: #122A20; margin-bottom: 12px;">
                Assalamu Alaikum wa Rahmatullah, ${recipientGreeting}!
              </div>

              <!-- Intro Message -->
              <p style="font-size: 14.5px; color: #4A5B52; margin: 0 0 14px; line-height: 1.6;">
                JazakAllahu Khairan for registering with <strong>Salah Companion</strong>. We are honored to accompany you on your daily prayer journey.
              </p>
              <p style="font-size: 14px; color: #4A5B52; margin: 0 0 20px; line-height: 1.6;">
                Please enter the following 6-digit verification code in the app to verify your email and activate your account:
              </p>

              <!-- 6-Digit OTP Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF8F2; border: 2px dashed #0C4535; border-radius: 16px; margin: 22px 0; text-align: center;">
                <tr>
                  <td align="center" style="padding: 24px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; color: #0C4535; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                      Your 6-Digit Code
                    </div>
                    <div class="otp-code" style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; font-size: 40px; font-weight: 800; color: #0C4535; letter-spacing: 12px; padding-left: 12px; margin: 8px 0; line-height: 1.2;">
                      ${otp}
                    </div>
                    <div style="font-size: 12px; color: #B45309; font-weight: 600; margin-top: 8px;">
                      ⏱️ Valid for 5 minutes only
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #D97706; border-radius: 8px; margin: 18px 0;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px; color: #92400E; line-height: 1.5;">
                    <strong>🔒 Security Notice:</strong> Never share this code with anyone. Salah Companion support will never ask for your verification code. This code is single-use and will expire in 5 minutes.
                  </td>
                </tr>
              </table>

              <!-- Quranic Ayat Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F8F5; border: 1px solid #D1E7DD; border-left: 4px solid #0C4535; border-radius: 8px; margin: 18px 0 8px;">
                <tr>
                  <td align="center" style="padding: 14px 18px; text-align: center; font-size: 13px; color: #164E3A; font-style: italic; line-height: 1.6;">
                    ”Indeed, prayer has been decreed upon the believers a decree of specified times.“
                    <br>
                    <strong style="font-style: normal; font-size: 11.5px; color: #0C4535; display: inline-block; margin-top: 4px;">— Surah An-Nisa (4:103)</strong>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #FAF8F2; border-top: 1px solid #EDE8DC; padding: 22px 28px; text-align: center; font-size: 11.5px; color: #8A9991; line-height: 1.6;">
              If you did not request this verification code, you can safely ignore this email.<br>
              © ${currentYear} Salah Companion. May Allah accept your prayers and steadfast deeds.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a 6-digit OTP verification email to the user
 * In production on Render, prioritizes Resend / HTTPS REST API (port 443) to guarantee deliverability
 * and display the custom Islamic-themed HTML template.
 *
 * @param {string} to Recipient email
 * @param {string} name Recipient name
 * @param {string} otp 6-digit numeric OTP code
 */
export async function sendOtpEmail(to, name, otp) {
  const htmlContent = getOtpEmailHtml(name, otp);
  const textContent = `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\nAssalamu Alaikum wa Rahmatullah ${name || 'Brother/Sister'},\n\nYour Salah Companion 6-digit verification code is:\n\n${otp}\n\n⏱️ This code is valid for 5 minutes only.\n🔒 Security Notice: Never share this code with anyone. Salah Companion will never ask for your code.\n\n”Indeed, prayer has been decreed upon the believers a decree of specified times.“ — Surah An-Nisa (4:103)\n\nMay Allah accept your prayers and steadfast deeds.\nSalah Companion Team`;

  const mailOptions = {
    from: config.emailFrom || `"Salah Companion" <${config.emailUser}>`,
    to,
    replyTo: config.emailUser || 'salahcompanion786@gmail.com',
    subject: `${otp} is your Salah Companion verification code 🕌`,
    text: textContent,
    html: htmlContent,
    headers: {
      'X-Entity-Ref-ID': `otp-${Date.now()}`,
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. PRIMARY IN PRODUCTION: Deliver via HTTPS REST API (Port 443 — Resend, Brevo, SendGrid, Mailgun)
  //    Bypasses cloud host SMTP blocking (Render Free tier blocks 465/587) and delivers our custom Islamic template
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const httpApiResult = await sendViaHttpApi({
      to,
      subject: `${otp} is your Salah Companion verification code 🕌`,
      html: htmlContent,
      text: textContent,
    });
    if (httpApiResult?.success) {
      console.log(`[EmailService] OTP email delivered via HTTP REST API (${httpApiResult.provider}) to ${to}: ${httpApiResult.messageId}`);
      return { success: true, messageId: httpApiResult.messageId, provider: httpApiResult.provider || 'http_api', otp };
    }
  } catch (httpErr) {
    console.warn(`[EmailService] HTTP REST API attempt threw error:`, httpErr.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. FALLBACK: Nodemailer SMTP (works in local dev / unblocked hosting)
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail(mailOptions);
    console.log(`[EmailService] OTP email successfully sent via SMTP to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, provider: 'smtp', otp };
  } catch (err) {
    console.error(`[EmailService] Primary SMTP delivery failed for OTP to ${to}:`, err.message);

    const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.IS_RENDER);

    // If on local dev/VPS and using Gmail, try alternate port
    if (!isRender && (config.emailHost?.includes('gmail.com') || config.emailService === 'gmail' || !config.emailHost)) {
      try {
        const primaryPort = Number(config.emailPort) || 465;
        const fallbackPort = primaryPort === 465 ? 587 : 465;
        console.log(`[EmailService] Retrying OTP via fallback Gmail port ${fallbackPort}...`);
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: fallbackPort,
          secure: fallbackPort === 465,
          family: 4,
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 8000,
          auth: { user: config.emailUser, pass: config.emailPass },
          tls: { rejectUnauthorized: false },
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[EmailService] OTP sent via fallback port ${fallbackPort} to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId, provider: 'smtp_fallback', otp };
      } catch (fallbackErr) {
        console.error(`[EmailService] Fallback OTP delivery failed:`, fallbackErr.message);
      }
    }

    const isRenderTimeout = isRender && (
      err.message?.includes('timeout') ||
      err.message?.includes('ETIMEDOUT') ||
      err.message?.includes('ESOCKETTIMEDOUT')
    );

    let friendlyError = err.message;
    if (lastHttpApiError) {
      friendlyError = lastHttpApiError;
    } else if (isRenderTimeout) {
      friendlyError = 'Mail server connection timeout. Cloud host (Render) restricts outbound SMTP ports (465/587). Please ensure RESEND_API_KEY is configured in Render Environment Variables.';
    } else if (err.message?.includes('535') || err.message?.includes('BadCredentials')) {
      friendlyError = 'Gmail SMTP authentication rejected. Please generate a 16-character App Password at Google Account > Security > App passwords.';
    }

    return { success: false, error: friendlyError, otp };
  }
}

/**
 * Generates the responsive Islamic-themed verification email HTML template
 */
function getVerificationEmailHtml(name, verificationUrl, directApiUrl) {
  const currentYear = new Date().getFullYear();
  const recipientGreeting = name ? name.trim() : 'Dear Brother/Sister';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email - Salah Companion</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #F4F1EA; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .header-padding { padding: 30px 18px 24px !important; }
      .content-padding { padding: 26px 18px 20px !important; }
      .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2D26; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F4F1EA; width: 100%; margin: 0; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E6E0D2; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td class="header-padding" align="center" style="background-color: #0C4535; background: linear-gradient(135deg, #061F17 0%, #0C4535 60%, #13614B 100%); padding: 36px 24px 30px; text-align: center; color: #FFFFFF;">
              <div style="font-size: 38px; line-height: 1; margin-bottom: 8px;">🕌</div>
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">Salah Companion</h1>
              <div style="font-size: 16px; color: #E5C67F; font-weight: 600; margin-top: 5px; font-family: 'Traditional Arabic', 'Scheherazade New', serif;">رفیقِ نماز</div>
              <div style="font-size: 11px; color: #C5E5D7; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px; font-weight: 600;">Email Verification • تفعيل الحساب</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content-padding" style="padding: 32px 28px 24px; line-height: 1.6; color: #1F2D26;">
              <div style="text-align: center; font-size: 15px; color: #B58728; margin-bottom: 18px; font-weight: 600; font-family: 'Traditional Arabic', 'Scheherazade New', serif; letter-spacing: 1px;">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>

              <div style="font-size: 17px; font-weight: 700; color: #122A20; margin-bottom: 12px;">
                Assalamu Alaikum wa Rahmatullah, ${recipientGreeting}!
              </div>

              <p style="font-size: 14.5px; color: #4A5B52; margin: 0 0 14px; line-height: 1.6;">
                JazakAllahu Khairan for registering with <strong>Salah Companion</strong>. We are honored to accompany you on your daily prayer journey.
              </p>
              <p style="font-size: 14px; color: #4A5B52; margin: 0 0 22px; line-height: 1.6;">
                To activate your account and start tracking your prayers on time, please click the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 26px 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" class="btn" target="_blank" style="display: inline-block; background-color: #0C4535; color: #FFFFFF !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(12, 69, 53, 0.3); text-align: center;">
                      Verify My Email &amp; Launch Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF8F2; border: 1px solid #ECE7DB; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 12.5px; color: #5C6E65; line-height: 1.5;">
                    ⏱️ <strong>Link Expiry:</strong> This verification link is valid for <strong>24 hours</strong>. Clicking it activates your account and automatically logs you in.
                  </td>
                </tr>
              </table>

              <!-- Quran Quote -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F8F5; border: 1px solid #D1E7DD; border-left: 4px solid #0C4535; border-radius: 8px; margin: 18px 0 14px;">
                <tr>
                  <td align="center" style="padding: 14px 18px; text-align: center; font-size: 13px; color: #164E3A; font-style: italic; line-height: 1.6;">
                    ”Establish prayer, for prayer restrains from shameful and unjust deeds.“
                    <br>
                    <strong style="font-style: normal; font-size: 11px; color: #0C4535; display: inline-block; margin-top: 4px;">— Surah Al-Ankabut (29:45)</strong>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <div style="font-size: 12px; color: #7A8B82; word-break: break-all; margin-top: 18px; padding-top: 16px; border-top: 1px dashed #E2DDD2; line-height: 1.6;">
                If the button above does not work, copy and paste this verification URL into your browser:<br>
                <a href="${verificationUrl}" target="_blank" style="color: #0C4535; text-decoration: underline;">${verificationUrl}</a>
                <br><br>
                Alternative direct API link:<br>
                <a href="${directApiUrl}" target="_blank" style="color: #0C4535; text-decoration: underline;">${directApiUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #FAF8F2; border-top: 1px solid #EDE8DC; padding: 22px 28px; text-align: center; font-size: 11.5px; color: #8A9991; line-height: 1.6;">
              If you did not create an account on Salah Companion, you can safely ignore this email.<br>
              © ${currentYear} Salah Companion. May Allah accept your prayers and deeds.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
 * Verifies email transport configuration
 */
export async function verifyEmailTransport() {
  if (process.env.BREVO_API_KEY || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.MAILGUN_API_KEY) {
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

