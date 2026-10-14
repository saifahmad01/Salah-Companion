/**
 * Premium Islamic Email Template for Salah Companion (رفیقِ نماز) - Password Reset
 *
 * Designed with:
 * - Emerald Green & Forest Green backgrounds (#07261C, #0C4535, #0E543F)
 * - Elegant Gold accents (#D4AF37, #E5C67F, #F0D69A)
 * - Sacred Bismillah and Arabic calligraphy
 * - High-contrast, beautifully formatted Password Reset Action Button
 * - 60-minute expiry countdown indicator
 * - Prominent security warning box
 * - Cross-client responsive table structure compatible with Gmail, Outlook, Apple Mail, and mobile
 */

/**
 * Returns the fully styled responsive HTML email string for password reset
 * @param {Object} options
 * @param {string} options.name Recipient's name (optional)
 * @param {string} options.resetUrl The secure password reset link
 * @param {number} [options.expiresInMinutes=60] Token lifetime in minutes
 * @returns {string}
 */
export function getResetPasswordEmailHtml({ name, resetUrl, expiresInMinutes = 60 }) {
  const recipientGreeting = name && name.trim() ? name.trim() : 'Dear Brother/Sister';
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Reset Your Salah Companion Password</title>
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
      .action-btn {
        width: 100% !important;
        display: block !important;
      }
    }
  </style>
</head>
<body width="100%" style="margin: 0; padding: 0; background-color: #061F17; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader text (preview in inbox) -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
    Reset your Salah Companion account password. This link is valid for ${expiresInMinutes} minutes.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #061F17; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 28px 12px 36px;">
        <!-- Card Container -->
        <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #FAF8F2; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); border: 1px solid #E5DCB8;">
          
          <!-- Top Emerald & Gold Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #07261C 0%, #0C4535 50%, #08291E 100%); background-color: #0C4535; padding: 32px 24px 28px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <!-- Bismillah Calligraphy -->
              <div style="font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 20px; color: #E5C67F; letter-spacing: 1px; margin-bottom: 12px; line-height: 1.4;">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>

              <!-- Brand Icon / Mosque Glyph -->
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.4); margin-bottom: 12px;">
                <span style="font-size: 26px; line-height: 48px; vertical-align: middle;">🕌</span>
              </div>

              <!-- Brand Title -->
              <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px; text-transform: uppercase;">
                Salah Companion
              </h1>
              <div style="font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 15px; color: #E5C67F; margin-top: 4px; letter-spacing: 2px;">
                رفیقِ نماز
              </div>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="content-padding" style="padding: 32px 32px 24px; color: #1E2922;">
              <!-- Greeting -->
              <h2 style="margin: 0 0 14px; font-size: 18px; font-weight: 700; color: #0C4535; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Salam Alaykum, ${recipientGreeting}
              </h2>

              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #3A4A3F;">
                We received a request to reset the password for your <strong>Salah Companion</strong> account. Click the button below to choose a new secure password:
              </p>

              <!-- Reset Password Action Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 24px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" class="action-btn" style="display: inline-block; background: linear-gradient(135deg, #F0D69A 0%, #E5C67F 50%, #D5AF5E 100%); background-color: #E5C67F; color: #14291F; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; border: 1px solid #C49E45; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Countdown Indicator -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #F4EEDC; border: 1px solid #D9CB9E; border-radius: 30px; padding: 6px 16px; font-size: 12px; color: #695318; font-weight: 600;">
                      ⏳ This link expires in <strong>${expiresInMinutes} minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link Display -->
              <div style="background-color: #F7F5EC; border: 1px solid #E6E0CC; border-radius: 10px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px; color: #556257; line-height: 1.5; word-break: break-all;">
                <strong>Having trouble with the button?</strong> Copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" target="_blank" style="color: #0C4535; text-decoration: underline;">${resetUrl}</a>
              </div>

              <!-- Security Notice Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF8E6; border-left: 4px solid #D4AF37; border-radius: 6px; padding: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 14px; font-size: 12px; line-height: 1.55; color: #6D5618;">
                    <strong>🛡️ Security Advice:</strong> If you did not request this password reset, please ignore this email. Your existing password will remain safe and unchanged. Never forward this email to anyone.
                  </td>
                </tr>
              </table>

              <!-- Inspiring Ayah -->
              <div style="border-top: 1px solid #EADDC2; padding-top: 18px; text-align: center;">
                <div style="font-family: 'Amiri', serif; font-size: 16px; color: #0C4535; line-height: 1.6; margin-bottom: 4px;">
                  وَأَقِمِ الصَّلَاةَ ۖ إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ
                </div>
                <div style="font-size: 11px; font-style: italic; color: #69786E; line-height: 1.4;">
                  "And establish prayer. Indeed, prayer prohibits immorality and wrongdoing."
                </div>
                <div style="font-size: 10px; color: #9AA79E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                  — Surah Al-Ankabut (29:45)
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #07261C; padding: 22px 24px; text-align: center; color: #A3B8AD; font-size: 11px; line-height: 1.6; border-top: 1px solid #144A39;">
              <p style="margin: 0 0 6px; color: #D4AF37; font-weight: 600;">
                Salah Companion • رفیقِ نماز
              </p>
              <p style="margin: 0 0 8px; color: #C2D1C8;">
                Your faithful companion for daily prayers, Qada tracking, and spiritual growth.
              </p>
              <p style="margin: 0; color: #6F877B; font-size: 10px;">
                © ${currentYear} Salah Companion. All rights reserved.
              </p>
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
 * Returns plain-text fallback for email clients that do not render HTML
 * @param {Object} options
 * @param {string} options.name Recipient's name (optional)
 * @param {string} options.resetUrl The secure password reset link
 * @param {number} [options.expiresInMinutes=60] Token lifetime in minutes
 * @returns {string}
 */
export function getResetPasswordEmailText({ name, resetUrl, expiresInMinutes = 60 }) {
  const greeting = name && name.trim() ? name.trim() : 'Dear Brother/Sister';
  return `SALAH COMPANION (رفیقِ نماز)
========================================

Salam Alaykum, ${greeting},

We received a request to reset the password for your Salah Companion account.

To choose a new password, visit the link below:
${resetUrl}

This link is valid for ${expiresInMinutes} minutes.

SECURITY ADVICE:
If you did not request a password reset, you can safely ignore this email.
Your current password will remain unchanged.

========================================
"And establish prayer. Indeed, prayer prohibits immorality and wrongdoing."
— Surah Al-Ankabut (29:45)

Salah Companion Team
salahcompanion786@gmail.com
`;
}
