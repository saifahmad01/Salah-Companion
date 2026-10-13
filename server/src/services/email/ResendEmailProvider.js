import { EmailProvider } from './EmailProvider.js';

/**
 * Resend Transactional HTTPS REST API Provider
 * Free tier: 100 emails/day, 3000/month.
 * Endpoint: POST https://api.resend.com/emails
 */
export class ResendEmailProvider extends EmailProvider {
  constructor() {
    super('resend');
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail =
      process.env.RESEND_FROM ||
      process.env.EMAIL_FROM ||
      'Salah Companion <onboarding@resend.dev>';
    this.timeoutMs = parseInt(process.env.EMAIL_TIMEOUT_MS || '8000', 10);
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Send transactional email via Resend HTTPS REST API
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured()) {
      throw new Error('ResendEmailProvider is not configured: missing RESEND_API_KEY');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject,
          html,
          text: text || '',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[ResendEmailProvider] HTTP ${response.status} Error: ${errorText}`);
        throw new Error(`Resend API rejected delivery (${response.status})`);
      }

      const data = await response.json().catch(() => ({}));
      const messageId = data.id || `resend-${Date.now()}`;
      console.log(`[ResendEmailProvider] ✅ Email delivered to ${to} (ID: ${messageId})`);

      return {
        success: true,
        messageId,
        provider: 'resend',
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[ResendEmailProvider] Request timed out after ${this.timeoutMs}ms`);
        throw new Error('Resend delivery timed out');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
