/**
 * Premium Islamic Email Template for Salah Companion (رفیقِ نماز)
 *
 * Designed with:
 * - Emerald Green & Forest Green backgrounds (#07261C, #0C4535, #0E543F)
 * - Elegant Gold accents (#D4AF37, #E5C67F, #F0D69A)
 * - Sacred Bismillah and Arabic calligraphy
 * - High-contrast, beautifully formatted 6-digit OTP section
 * - 5-minute expiry countdown indicator
 * - Prominent security warning box
 * - Inspiring Quranic Ayah on prayer
 * - Cross-client responsive table structure compatible with Gmail, Outlook, Apple Mail, and mobile
 */

/**
 * Returns the fully styled responsive HTML email string
 * @param {Object} options
 * @param {string} options.name Recipient's name (optional)
 * @param {string} options.otp The 6-digit OTP code
 * @param {number} [options.expiresInMinutes=5] OTP lifetime in minutes
 * @returns {string}
 */
export function getOtpEmailHtml({ name, otp, expiresInMinutes = 5 }) {
  const recipientGreeting = name && name.trim() ? name.trim() : 'Dear Brother/Sister';
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Your Salah Companion Verification Code</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: #061F17 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
      border-collapse: collapse !important;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    /* Responsive tweaks */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .content-padding {
        padding: 24px 18px !important;
      }
      .otp-digit {
        font-size: 34px !important;
        letter-spacing: 8px !important;
      }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0; background-color: #061F17; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader text (preview in inbox) -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
    Your Salah Companion 6-digit verification code is ${otp}. Valid for ${expiresInMinutes} minutes. Never share this code.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #061F17; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 28px 12px 36px;">
        <!-- Card Container -->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FAF8F2; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); border: 1px solid #E5DCB8;">
          
          <!-- Top Architectural Emerald Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #051A13 0%, #0A382A 60%, #062319 100%); background-color: #0A382A; padding: 34px 24px 28px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <!-- Minaret / Mosque Badge Icon -->
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background-color: #051E16; border: 1.5px solid #E5C67F; border-radius: 14px; font-size: 24px; text-align: center; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);">
                🕌
              </div>
              <!-- Brand Title -->
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: bold; color: #FFFFFF; letter-spacing: 0.5px; line-height: 1.2;">
                Salah Companion
              </div>
              <!-- Arabic Calligraphic Subtitle -->
              <div style="font-size: 15px; color: #F0D69A; font-weight: 600; margin-top: 4px; font-family: 'Traditional Arabic', 'Scheherazade New', 'Amiri', serif;">
                رفیقِ نماز
              </div>
              <!-- Header Category Badge -->
              <div style="display: inline-block; font-size: 10px; color: #C5E5D7; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; font-weight: 700; background-color: rgba(255, 255, 255, 0.08); padding: 4px 12px; border-radius: 9999px; border: 1px solid rgba(229, 198, 127, 0.3);">
                Sign-In Verification • رمز التحقق
              </div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-padding" style="padding: 32px 30px 24px; line-height: 1.6; color: #1F2D26;">
              <!-- Bismillah Header -->
              <div style="text-align: center; font-size: 17px; color: #9A7B2C; margin-bottom: 20px; font-weight: 700; font-family: 'Traditional Arabic', 'Scheherazade New', 'Amiri', serif; letter-spacing: 0.5px;">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>

              <!-- Greeting -->
              <div style="font-size: 17px; font-weight: 700; color: #0C3E30; margin-bottom: 10px;">
                Assalamu Alaikum wa Rahmatullah, ${recipientGreeting}!
              </div>

              <!-- Message Text -->
              <p style="font-size: 14.5px; color: #3B4E44; margin: 0 0 14px; line-height: 1.6;">
                We received a request to access your <strong>Salah Companion</strong> account. Enter the 6-digit one-time code below to complete your sign-in:
              </p>

              <!-- 6-Digit OTP Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(180deg, #F5EFE4 0%, #EFE8DA 100%); background-color: #F5EFE4; border: 2px dashed #0C4535; border-radius: 16px; margin: 24px 0; text-align: center;">
                <tr>
                  <td align="center" style="padding: 24px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 800; color: #0C4535; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 6px;">
                      Your Verification Code
                    </div>
                    <div class="otp-digit" style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; font-size: 42px; font-weight: 800; color: #072B20; letter-spacing: 12px; padding-left: 12px; margin: 10px 0; line-height: 1.2;">
                      ${otp}
                    </div>
                    <!-- Countdown Expiry Pill -->
                    <div style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; margin-top: 6px;">
                      ⏱️ Valid for ${expiresInMinutes} minutes only
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Alert Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-left: 4px solid #D97706; border-radius: 10px; margin: 20px 0 16px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12.5px; color: #78350F; line-height: 1.5;">
                    <strong>🔒 Security Warning:</strong> Never share this code with anyone. Salah Companion will never ask you for your code via email, message, or phone. This code is single-use and will expire immediately after verification.
                  </td>
                </tr>
              </table>

              <!-- Quranic Ayah Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F6F3; border: 1px solid #CDE2D8; border-left: 4px solid #0E543F; border-radius: 10px; margin: 16px 0 8px;">
                <tr>
                  <td align="center" style="padding: 14px 18px; text-align: center; font-size: 13px; color: #0E543F; font-style: italic; line-height: 1.6;">
                    ”Indeed, prayer has been decreed upon the believers a decree of specified times.“
                    <div style="font-style: normal; font-size: 11.5px; color: #08382A; font-weight: 700; margin-top: 5px;">
                      — Surah An-Nisa (4:103)
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12.5px; color: #667A70; margin: 20px 0 0; text-align: center;">
                If you did not request this login code, you can safely ignore this email. Your account remains completely secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #F2ECE0; border-top: 1px solid #E5DCB8; padding: 22px 24px; text-align: center; font-size: 11.5px; color: #788A80; line-height: 1.6;">
              <div style="color: #0E543F; font-weight: 600; margin-bottom: 4px;">
                May Allah accept your Salah and bless your spiritual consistency.
              </div>
              <div>
                © ${currentYear} Salah Companion (رفیقِ نماز). All rights reserved.
              </div>
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
 * Returns plain-text fallback string for email clients that do not support HTML
 * @param {Object} options
 * @param {string} options.name Recipient's name
 * @param {string} options.otp The 6-digit OTP code
 * @param {number} [options.expiresInMinutes=5] OTP lifetime in minutes
 * @returns {string}
 */
export function getOtpEmailText({ name, otp, expiresInMinutes = 5 }) {
  const recipientGreeting = name && name.trim() ? name.trim() : 'Brother/Sister';
  const currentYear = new Date().getFullYear();

  return `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ

Assalamu Alaikum wa Rahmatullah, ${recipientGreeting}!

Your Salah Companion 6-digit verification code is:

------------------------------------
${otp}
------------------------------------

⏱️ Valid for ${expiresInMinutes} minutes only.
🔒 Security Warning: Never share this code with anyone. Salah Companion will never ask for your code.

”Indeed, prayer has been decreed upon the believers a decree of specified times.“ — Surah An-Nisa (4:103)

If you did not request this code, you can safely ignore this email.

May Allah accept your Salah and bless your spiritual consistency.
© ${currentYear} Salah Companion (رفیقِ نماز)`;
}
