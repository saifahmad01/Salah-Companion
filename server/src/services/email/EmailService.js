import { BrevoEmailProvider } from './BrevoEmailProvider.js';
import { ResendEmailProvider } from './ResendEmailProvider.js';

/**
 * Generates the responsive Islamic-themed OTP verification email HTML template
 */
export function getOtpEmailHtml(name, otp) {
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
 * Enterprise EmailService: selects exactly one active HTTPS REST provider at a time
 */
export class EmailService {
  constructor() {
    this.brevoProvider = new BrevoEmailProvider();
    this.resendProvider = new ResendEmailProvider();
  }

  /**
   * Resolves the single active email provider based on EMAIL_PROVIDER env variable
   * @returns {import('./EmailProvider.js').EmailProvider}
   */
  getActiveProvider() {
    const requestedProvider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();

    // 1. Explicit selection
    if (requestedProvider === 'brevo') {
      if (this.brevoProvider.isConfigured()) {
        return this.brevoProvider;
      }
      if (process.env.NODE_ENV === 'production') {
        throw new Error('EMAIL_PROVIDER is set to "brevo" but BREVO_API_KEY is not configured in production');
      }
    }

    if (requestedProvider === 'resend') {
      if (this.resendProvider.isConfigured()) {
        return this.resendProvider;
      }
      if (process.env.NODE_ENV === 'production') {
        throw new Error('EMAIL_PROVIDER is set to "resend" but RESEND_API_KEY is not configured in production');
      }
    }

    // 2. Automatic selection: Brevo prioritized for 300 free emails/day to any recipient
    if (this.brevoProvider.isConfigured()) {
      return this.brevoProvider;
    }

    if (this.resendProvider.isConfigured()) {
      return this.resendProvider;
    }

    // 3. Test environment mock
    if (process.env.NODE_ENV === 'test') {
      return {
        name: 'mock',
        isConfigured: () => true,
        sendEmail: async ({ to }) => {
          console.log(`[EmailService] Mock email sent to ${to} in test environment`);
          return { success: true, messageId: `mock-${Date.now()}`, provider: 'mock' };
        },
      };
    }

    return null;
  }

  /**
   * Sends an OTP verification email using the configured provider
   * @param {string} to
   * @param {string} name
   * @param {string} otp
   */
  async sendOtpEmail(to, name, otp) {
    const provider = this.getActiveProvider();

    if (!provider) {
      throw new Error('No transactional email provider configured. Please set BREVO_API_KEY or RESEND_API_KEY.');
    }

    const html = getOtpEmailHtml(name, otp);
    const text = `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\nAssalamu Alaikum wa Rahmatullah ${name || 'Brother/Sister'},\n\nYour Salah Companion 6-digit verification code is:\n\n${otp}\n\n⏱️ This code is valid for 5 minutes only.\n🔒 Security Notice: Never share this code with anyone. Salah Companion will never ask for your code.\n\n”Indeed, prayer has been decreed upon the believers a decree of specified times.“ — Surah An-Nisa (4:103)\n\nMay Allah accept your prayers and steadfast deeds.\nSalah Companion Team`;
    const subject = `${otp} is your Salah Companion verification code 🕌`;

    const result = await provider.sendEmail({
      to,
      subject,
      html,
      text,
    });

    return {
      success: true,
      messageId: result.messageId,
      provider: result.provider || provider.name,
      otp,
    };
  }
}

// Singleton export
export const emailServiceInstance = new EmailService();
