/**
 * Base abstract EmailProvider class for Salah Companion
 */
export class EmailProvider {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if this provider has required credentials configured
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }

  /**
   * Send transactional email over HTTPS REST API
   * @param {object} options
   * @param {string} options.to
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} [options.text]
   * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
   */
  async sendEmail(options) {
    throw new Error(`sendEmail not implemented for ${this.name}`);
  }
}
