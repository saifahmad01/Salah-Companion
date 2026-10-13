import { EmailProvider } from './EmailProvider.js';

/**
 * Brevo (formerly Sendinblue) Transactional HTTPS REST API Provider
 * Free tier: 300 emails/day to ANY recipient without domain restriction.
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 */
export class BrevoEmailProvider extends EmailProvider {
  constructor() {
    super('brevo');
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.senderEmail =
      process.env.BREVO_FROM ||
      process.env.EMAIL_FROM ||
      process.env.EMAIL_USER ||
      'salahcompanion786@gmail.com';
    this.senderName =
      process.env.BREVO_SENDER_NAME ||
      process.env.EMAIL_FROM_NAME ||
      'Salah Companion';
    this.timeoutMs = parseInt(process.env.EMAIL_TIMEOUT_MS || '8000', 10);
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Send transactional email via Brevo HTTPS REST API
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      throw new Error('BrevoEmailProvider is not configured: missing BREVO_API_KEY');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text || '',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let parsedMessage = '';
        try {
          const parsed = JSON.parse(errorText);
          parsedMessage = parsed.message || '';
        } catch (_) {}
        console.warn(`[BrevoEmailProvider] HTTP ${response.status} Error: ${errorText}`);
        const errMsg = parsedMessage || `Brevo API rejected delivery (${response.status})`;
        throw new Error(errMsg);
      }

      const data = await response.json().catch(() => ({}));
      const messageId = data.messageId || `brevo-${Date.now()}`;
      console.log(`[BrevoEmailProvider] ✅ Email delivered to ${to} (Message ID: ${messageId})`);

      return {
        success: true,
        messageId,
        provider: 'brevo',
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[BrevoEmailProvider] Request timed out after ${this.timeoutMs}ms`);
        throw new Error('Brevo delivery timed out');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
