import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';
import { brevoEmailService } from './email/brevoEmailService.js';
import { isPermanentAdmin } from '../constants/admins.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

/**
 * OTP Service for Salah Companion
 *
 * Implements:
 * - Cryptographically random 6-digit generation (crypto.randomInt)
 * - HMAC-SHA256 secure hashing with server secret (never plain text)
 * - Timing-safe comparison to prevent timing attacks
 * - 5-minute strict expiration
 * - 60-second resend cooldown per email
 * - 5-attempt limit with automatic invalidation and lockout
 * - Single-use token invalidation upon verification
 * - Seamless integration with Brevo Email Service
 */
class OtpService {
  /**
   * Generates a cryptographically secure 6-digit numeric string
   * @returns {string}
   */
  generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hashes the 6-digit OTP using HMAC-SHA256 and server secret
   * @param {string} otp
   * @returns {string}
   */
  hashOtp(otp) {
    const secret = config.jwtSecret || 'salah_companion_otp_secret_key';
    return crypto.createHmac('sha256', secret).update(String(otp).trim()).digest('hex');
  }

  /**
   * Performs timing-safe comparison of input OTP against stored hash
   * @param {string} inputOtp
   * @param {string} storedHash
   * @returns {boolean}
   */
  verifyHash(inputOtp, storedHash) {
    try {
      const inputHash = this.hashOtp(inputOtp);
      const inputBuf = Buffer.from(inputHash, 'hex');
      const storedBuf = Buffer.from(storedHash, 'hex');

      if (inputBuf.length !== storedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(inputBuf, storedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Generates and delivers a 6-digit OTP to the user's email via Brevo
   *
   * @param {Object} params
   * @param {string} params.email
   * @param {string} [params.name]
   * @returns {Promise<{ success: boolean, message: string, email: string, cooldownSeconds: number, expiresInSeconds: number }>}
   */
  async requestOtp({ email, name, isAuthorizedTest = false }) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const now = Date.now();

    // 2. Enforce 60-second resend cooldown
    if (user && user.lastVerificationSentAt) {
      const lastSent = new Date(user.lastVerificationSentAt).getTime();
      const elapsed = now - lastSent;

      if (elapsed < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        const error = new Error(`Please wait ${remainingSeconds} seconds before requesting a new code.`);
        error.code = 'RESEND_COOLDOWN';
        error.retryAfter = remainingSeconds;
        throw error;
      }
    }

    // 3. Generate secure OTP and store hash + attempts count
    const otp = this.generateOtp();
    const hash = this.hashOtp(otp);
    const expiresAt = new Date(now + OTP_TTL_MS);
    const storedTokenValue = `${hash}:0`; // hash:failedAttempts

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: storedTokenValue,
          tokenExpiresAt: expiresAt,
          lastVerificationSentAt: new Date(now),
          ...(isPermanentAdmin(normalizedEmail) ? { role: 'ADMIN' } : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name ? name.trim() : normalizedEmail.split('@')[0],
          isEmailVerified: false,
          verificationTokenHash: storedTokenValue,
          tokenExpiresAt: expiresAt,
          lastVerificationSentAt: new Date(now),
          role: isPermanentAdmin(normalizedEmail) ? 'ADMIN' : 'USER',
          prayerCalculationMethod: 'Karachi',
        },
      });
    }

    // 4. Send email via Brevo
    try {
      await brevoEmailService.sendOtpEmail({
        to: normalizedEmail,
        name: user.name,
        otp,
        expiresInMinutes: 5,
        isAuthorizedTest,
      });
    } catch (err) {
      // Clear token if delivery failed completely so user is not locked out
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: null,
          tokenExpiresAt: null,
          lastVerificationSentAt: null,
        },
      }).catch(() => {});

      throw new Error(`Failed to deliver verification code: ${err.message}`);
    }

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
      email: normalizedEmail,
      cooldownSeconds: 60,
      expiresInSeconds: 300,
    };
  }

  /**
   * Validates user-submitted OTP against stored cryptographic hash
   *
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.otp
   * @returns {Promise<{ success: boolean, user: Object }>}
   */
  async verifyOtp({ email, otp }) {
    const normalizedEmail = email.trim().toLowerCase();
    const sanitizedOtp = String(otp).trim();

    if (!sanitizedOtp || sanitizedOtp.length !== 6 || !/^\d{6}$/.test(sanitizedOtp)) {
      const error = new Error('Verification code must be exactly 6 digits.');
      error.code = 'INVALID_OTP_FORMAT';
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.verificationTokenHash || !user.tokenExpiresAt) {
      const error = new Error('No active verification code found. Please request a new code.');
      error.code = 'NO_ACTIVE_OTP';
      throw error;
    }

    // 1. Check expiration
    const now = Date.now();
    const expiresAt = new Date(user.tokenExpiresAt).getTime();

    if (now > expiresAt) {
      // Invalidate expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: null,
          tokenExpiresAt: null,
        },
      });

      const error = new Error('Verification code has expired. Please request a new code.');
      error.code = 'OTP_EXPIRED';
      throw error;
    }

    // 2. Parse stored hash and attempt count
    const [storedHash, attemptsStr] = user.verificationTokenHash.split(':');
    const currentAttempts = parseInt(attemptsStr || '0', 10);

    // 3. Check attempt limit
    if (currentAttempts >= MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: null,
          tokenExpiresAt: null,
        },
      });

      const error = new Error('Too many incorrect attempts. Please request a new verification code.');
      error.code = 'OTP_MAX_ATTEMPTS_EXCEEDED';
      throw error;
    }

    // 4. Timing-safe verification
    const isMatch = this.verifyHash(sanitizedOtp, storedHash);

    if (!isMatch) {
      const nextAttempts = currentAttempts + 1;
      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationTokenHash: null,
            tokenExpiresAt: null,
          },
        });

        const error = new Error('Too many incorrect attempts. This code has been deactivated. Please request a new code.');
        error.code = 'OTP_MAX_ATTEMPTS_EXCEEDED';
        throw error;
      }

      // Update failed attempts counter
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: `${storedHash}:${nextAttempts}`,
        },
      });

      const error = new Error(`Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`);
      error.code = 'OTP_MISMATCH';
      error.remainingAttempts = remainingAttempts;
      throw error;
    }

    // 5. Verification successful: invalidate single-use token and mark email verified
    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationTokenHash: null,
        tokenExpiresAt: null,
        ...(isPermanentAdmin(normalizedEmail) ? { role: 'ADMIN' } : {}),
      },
    });

    return {
      success: true,
      user: verifiedUser,
    };
  }
}

export const otpService = new OtpService();
export default otpService;
