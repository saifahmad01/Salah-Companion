import nodemailer from 'nodemailer';
import { config } from '../../config/env.js';
import { getOtpEmailHtml, getOtpEmailText } from './templates/otpEmailTemplate.js';

/**
 * Brevo Transactional Email Service
 *
 * Implements:
 * 1. Primary: Brevo SMTP Relay (smtp-relay.brevo.com:587) via Nodemailer
 * 2. Secondary/Fallback: Brevo HTTPS REST API (https://api.brevo.com/v3/smtp/email) on port 443
 *    (Vital for cloud hosting environments like Render where outbound SMTP ports are blocked)
 * 3. Premium Islamic-themed HTML template with full plain-text fallback
 * 4. Strict security: zero credential or OTP leakage in logs or exceptions
 */
class BrevoEmailService {
  constructor() {
    this.transporter = null;
    this.smtpInitialized = false;
  }

  /**
   * Resolves SMTP configuration from environment
   */
  getSmtpConfig() {
    const host = process.env.BREVO_SMTP_HOST || config.brevoSmtpHost || 'smtp-relay.brevo.com';
    const port = Number(process.env.BREVO_SMTP_PORT || config.brevoSmtpPort || 587);
    const user = process.env.BREVO_SMTP_USER || config.brevoSmtpUser || '';
    const pass = process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_PASSWORD || config.brevoSmtpKey || '';

    return { host, port, user, pass };
  }

  /**
   * Resolves Brevo HTTP REST API Key
   */
  getApiKey() {
    return process.env.BREVO_API_KEY || config.brevoApiKey || '';
  }

  /**
   * Resolves verified sender details
   */
  getSender() {
    const email = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS || config.brevoSenderEmail || 'salahcompanion786@gmail.com';
    const name = process.env.BREVO_SENDER_NAME || config.brevoSenderName || 'Salah Companion';
    return { email, name };
  }

  /**
   * Checks whether Brevo is configured (either via SMTP or REST API)
   */
  isConfigured() {
    const smtp = this.getSmtpConfig();
    const apiKey = this.getApiKey();
    return Boolean((smtp.user && smtp.pass) || apiKey);
  }

  /**
   * Initializes or returns the cached Nodemailer SMTP transporter
   */
  getTransporter() {
    const smtp = this.getSmtpConfig();
    if (!smtp.user || !smtp.pass) {
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Sends email via Brevo's HTTPS REST API (Port 443)
   * Essential when outbound SMTP ports (25, 465, 587) are firewalled
   */
  async sendViaRestApi({ to, name, subject, html, text }) {
    const apiKey = this.getApiKey() || this.getSmtpConfig().pass;
    if (!apiKey) {
      throw new Error('Brevo API key is not configured for REST delivery');
    }

    const sender = this.getSender();

    const payload = {
      sender: {
        name: sender.name,
        email: sender.email,
      },
      to: [
        {
          email: to,
          name: name || 'Brother/Sister',
        },
      ],
      subject,
      htmlContent: html,
      textContent: text,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `Brevo API HTTP ${response.status}: ${data.code || 'UNKNOWN_ERROR'}`;
        throw new Error(errorMsg);
      }

      return {
        success: true,
        messageId: data.messageId || `brevo-api-${Date.now()}`,
        transport: 'brevo_rest_api',
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Brevo REST API request timed out after 10 seconds');
      }
      throw err;
    }
  }

  /**
   * Sends the 6-digit OTP verification email via Brevo
   *
   * @param {Object} params
   * @param {string} params.to Recipient email address
   * @param {string} [params.name] Recipient name
   * @param {string} params.otp 6-digit verification code
   * @param {number} [params.expiresInMinutes=5] Expiration in minutes
   * @returns {Promise<{ success: boolean, messageId?: string, transport?: string }>}
   */
  async sendOtpEmail({ to, name, otp, expiresInMinutes = 5, isAuthorizedTest = false }) {
    if (!to || !to.includes('@')) {
      throw new Error('Valid recipient email address is required');
    }

    if (!otp || String(otp).length !== 6) {
      throw new Error('Valid 6-digit OTP is required');
    }

    const subject = `${otp} is your Salah Companion verification code 🕌`;
    const html = getOtpEmailHtml({ name, otp, expiresInMinutes });
    const text = getOtpEmailText({ name, otp, expiresInMinutes });
    const sender = this.getSender();

    // 1. In test environment or authorized test harness, simulate delivery without external network call
    if (process.env.NODE_ENV === 'test' || isAuthorizedTest) {
      return {
        success: true,
        messageId: `test-harness-${Date.now()}`,
        transport: 'test_harness',
      };
    }

    // 2. Fail safely if neither SMTP nor REST API is configured
    if (!this.isConfigured()) {
      throw new Error(
        'Email service is not configured. Please set BREVO_SMTP_KEY (or BREVO_API_KEY) and BREVO_SMTP_USER in your environment variables.'
      );
    }

    // 3. Primary Delivery: Brevo SMTP Relay
    const transporter = this.getTransporter();
    let smtpError = null;

    if (transporter) {
      try {
        const mailOptions = {
          from: `"${sender.name}" <${sender.email}>`,
          to,
          subject,
          text,
          html,
          headers: {
            'X-Mailin-Tag': 'salah-companion-otp',
          },
        };

        const info = await transporter.sendMail(mailOptions);
        return {
          success: true,
          messageId: info.messageId,
          transport: 'brevo_smtp',
        };
      } catch (err) {
        smtpError = err;
        console.warn(`[BrevoEmailService] Primary SMTP delivery to ${to.replace(/(?<=.).(?=.*@)/g, '*')} failed: ${err.message}. Attempting REST API fallback.`);
      }
    }

    // 4. Secondary Delivery: Brevo REST API (bypasses Render/cloud SMTP port blocks)
    try {
      const restResult = await this.sendViaRestApi({ to, name, subject, html, text });
      return restResult;
    } catch (restErr) {
      console.error(`[BrevoEmailService] REST API delivery failed: ${restErr.message}`);
      const combinedError = smtpError
        ? `SMTP failed (${smtpError.message}) and REST API failed (${restErr.message})`
        : restErr.message;
      throw new Error(`Failed to deliver verification email: ${combinedError}`);
    }
  }
}

export const brevoEmailService = new BrevoEmailService();
export default brevoEmailService;
