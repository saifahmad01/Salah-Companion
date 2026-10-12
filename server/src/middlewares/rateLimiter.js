/**
 * Zero-dependency Sliding-Window Rate Limiter Middleware
 * Protects authentication endpoints against brute-force, email bombarding, and denial-of-service.
 */

class SlidingWindowRateLimiter {
  constructor({ windowMs, maxRequests, keyGenerator, message, code = 'RATE_LIMITED' }) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyGenerator = keyGenerator || ((req) => req.ip || req.connection.remoteAddress || 'unknown');
    this.message = message || 'Too many requests. Please try again later.';
    this.code = code;
    this.hits = new Map();

    // Periodically clean up expired entries every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Prevent interval from blocking Node.js process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((time) => now - time < this.windowMs);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      const key = this.keyGenerator(req);
      if (!key) return next();

      const now = Date.now();
      const currentTimestamps = this.hits.get(key) || [];
      const windowStart = now - this.windowMs;

      // Filter out timestamps outside the active sliding window
      const validTimestamps = currentTimestamps.filter((time) => time > windowStart);

      if (validTimestamps.length >= this.maxRequests) {
        const oldest = validTimestamps[0];
        const retryAfterSec = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));

        res.setHeader('Retry-After', retryAfterSec);
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil((oldest + this.windowMs) / 1000));

        return res.status(429).json({
          success: false,
          error: typeof this.message === 'function' ? this.message(retryAfterSec) : this.message,
          code: this.code,
          retryAfter: retryAfterSec,
        });
      }

      // Record this hit
      validTimestamps.push(now);
      this.hits.set(key, validTimestamps);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - validTimestamps.length));

      next();
    };
  }
}

/**
 * 1. IP-level Rate Limiter for Registration: Max 15 registrations per hour per IP
 */
export const registerIpRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 30, // 30 registrations per hour
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'ip_unknown',
  message: (retryAfterSec) => `Too many registration attempts from this network. Please try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
  code: 'IP_RATE_LIMITED',
}).middleware();

/**
 * 2. Email-level Rate Limiter for Resend Verification: Max 5 resend requests per hour per email
 */
export const resendHourlyRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 emails per hour per address
  keyGenerator: (req) => {
    const email = req.body?.email;
    return email && typeof email === 'string' ? `resend_email_${email.trim().toLowerCase()}` : null;
  },
  message: (retryAfterSec) => `You have reached the maximum verification email limit (5 per hour). Please check your spam folder or wait ${Math.ceil(retryAfterSec / 60)} minutes before trying again.`,
  code: 'HOURLY_RATE_LIMITED',
}).middleware();

/**
 * 3. General Auth IP Limiter (Login, Forgot Password): Max 30 attempts per 15 minutes per IP
 */
export const authIpRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 60,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'auth_unknown',
  message: (retryAfterSec) => `Too many requests from your IP. Please try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
  code: 'AUTH_IP_RATE_LIMITED',
}).middleware();
