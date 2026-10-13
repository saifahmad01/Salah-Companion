import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import {
  sendVerificationEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  verifyEmailTransport,
} from '../services/emailService.js';
import {
  verifyGoogleToken,
  getGoogleAuthUrl,
  getGoogleProfileFromCode,
} from '../services/googleAuthService.js';
import { config } from '../config/env.js';
import { isPermanentAdmin } from '../constants/admins.js';

const JWT_SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret_for_dev_only_change_in_production';
const JWT_EXPIRES_IN = config.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '7d';
const FRONTEND_URL = config.frontendUrl || 'http://localhost:5173';

/**
 * Resolves the active frontend domain dynamically, prioritizing Cloudflare Workers production domain
 */
export function getEffectiveFrontendUrl(req) {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER) || Boolean(process.env.RENDER_SERVICE_ID);
  const origin = req?.headers?.origin || req?.headers?.referer;
  if (origin) {
    if (origin.includes('salah-companion.mdsaif.workers.dev') || origin.includes('.workers.dev')) {
      try {
        const parsed = new URL(origin);
        return parsed.origin;
      } catch {
        return 'https://salah-companion.mdsaif.workers.dev';
      }
    }
    if (!isProduction && (origin.includes('localhost:5173') || origin.includes('localhost:3000'))) {
      return origin.includes('localhost:3000') ? 'http://localhost:3000' : 'http://localhost:5173';
    }
    // Route any legacy Netlify traffic directly to Cloudflare Workers
    if (origin.includes('netlify.app')) {
      return 'https://salah-companion.mdsaif.workers.dev';
    }
  }
  const configured = (config.frontendUrl || FRONTEND_URL || '').replace('salahcopmanion', 'salahcompanion').replace(/\/+$/, '');
  if (configured && !configured.includes('netlify.app')) {
    if (isProduction && (configured.includes('localhost') || configured.includes('127.0.0.1'))) {
      return 'https://salah-companion.mdsaif.workers.dev';
    }
    return configured;
  }
  return 'https://salah-companion.mdsaif.workers.dev';
}

/**
 * Helper to generate signed JWT token
 * @param {object} user
 */
export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/**
 * Set secure HttpOnly session cookie
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setAuthCookie(res, token) {
  const isProd = config.nodeEnv === 'production';
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear secure HttpOnly session cookie
 * @param {import('express').Response} res
 */
export function clearAuthCookie(res) {
  const isProd = config.nodeEnv === 'production';
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

// Pre-computed dummy hash for timing-attack-safe password verification
const DUMMY_HASH = '$2a$12$e80yq9X1K5pU77m4x9iFPeu8YpEev6J4l0k0vR5jU4M0d9F0A3x7W';

/**
 * Compute cryptographic SHA-256 hash of a verification token
 * @param {string} rawToken
 * @returns {string} 64-character hex string
 */
export function hashVerificationToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Generate a new single-use verification token and its SHA-256 hash (legacy compatibility)
 * @returns {{ rawToken: string, tokenHash: string }}
 */
export function generateVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP code and its SHA-256 hash
 * @returns {{ otp: string, tokenHash: string }}
 */
export function generateOtp() {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const tokenHash = hashVerificationToken(otp);
  return { otp, tokenHash };
}

// In-memory sliding window for OTP failed attempt tracking and lockout
// Key: normalizedEmail -> { attempts: number, lockedUntil: number }
const otpAttemptsMap = new Map();
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout after 5 consecutive failed attempts

export function recordFailedOtpAttempt(email) {
  const current = otpAttemptsMap.get(email) || { attempts: 0, lockedUntil: 0 };
  current.attempts += 1;
  if (current.attempts >= MAX_OTP_ATTEMPTS) {
    current.lockedUntil = Date.now() + OTP_LOCKOUT_MS;
  }
  otpAttemptsMap.set(email, current);
  return getOtpAttemptStatus(email);
}

export function getOtpAttemptStatus(email) {
  const current = otpAttemptsMap.get(email);
  if (!current) return { attempts: 0, locked: false, remaining: MAX_OTP_ATTEMPTS };
  if (current.lockedUntil > Date.now()) {
    return {
      attempts: current.attempts,
      locked: true,
      remaining: 0,
      retryAfterSec: Math.ceil((current.lockedUntil - Date.now()) / 1000),
    };
  }
  if (current.lockedUntil > 0 && current.lockedUntil <= Date.now()) {
    otpAttemptsMap.delete(email);
    return { attempts: 0, locked: false, remaining: MAX_OTP_ATTEMPTS };
  }
  return {
    attempts: current.attempts,
    locked: false,
    remaining: Math.max(0, MAX_OTP_ATTEMPTS - current.attempts),
  };
}

export function clearOtpFailedAttempts(email) {
  otpAttemptsMap.delete(email);
}

/**
 * Helper to sanitize user object (strip password, token hashes, and internal timestamps)
 * @param {object} user
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const {
    password,
    verificationTokenHash,
    verificationToken,
    tokenExpiresAt,
    lastVerificationSentAt,
    resetPasswordTokenHash,
    resetPasswordExpiresAt,
    ...sanitized
  } = user;
  return {
    ...sanitized,
    hasPassword: Boolean(password),
  };
}

/**
 * 1. Register a new user with 6-Digit Email OTP Verification
 * POST /api/auth/register
 *
 * Rules:
 * - Checks if email already belongs to an active user account in `User`.
 *   If it does, return 409 Conflict: "An account with this email already exists. Please log in."
 * - Checks if email has a pending registration in `PendingRegistration`.
 *   If yes, checks resend cooldown (60s).
 * - Hashes password (bcrypt salt rounds = 12).
 * - Generates cryptographically secure 6-digit numeric OTP (5-minute expiration, SHA-256 hash stored).
 * - Sends OTP verification email first.
 *   If email delivery fails, returns 502 Bad Gateway with honest diagnostic error.
 * - If email succeeds, upserts into `PendingRegistration` (User account is NOT created in `users` yet!).
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, prayerCalculationMethod, latitude, longitude } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if an active account already exists in `User`
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please log in.',
        code: 'EMAIL_ALREADY_EXISTS',
        email: normalizedEmail,
      });
    }

    // 2. Check if a pending registration already exists
    const existingPending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingPending) {
      // Check resend cooldown
      const elapsedMs = Date.now() - new Date(existingPending.lastSentAt).getTime();
      const cooldownMs = config.verificationResendCooldownSec * 1000;
      if (elapsedMs < cooldownMs) {
        const retryAfterSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          error: `A verification code was recently sent to this email. Please check your inbox or wait ${retryAfterSec} seconds to request another code.`,
          code: 'RATE_LIMITED',
          email: normalizedEmail,
          retryAfter: retryAfterSec,
        });
      }
    }

    // 3. Hash password with bcrypt (salt rounds = 12)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Generate cryptographically secure 6-digit numeric OTP and SHA-256 hash
    const { otp, tokenHash } = generateOtp();
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute strict OTP validity
    const recipientName = name || existingPending?.name || 'Brother/Sister';

    // 5. Send OTP verification email
    const emailResult = await sendOtpEmail(normalizedEmail, recipientName, otp);

    // 6. Upsert into PendingRegistration so the registration is safely recorded
    if (existingPending) {
      await prisma.pendingRegistration.update({
        where: { id: existingPending.id },
        data: {
          name: name || existingPending.name,
          password: hashedPassword,
          prayerCalculationMethod: prayerCalculationMethod || existingPending.prayerCalculationMethod,
          latitude: latitude ?? existingPending.latitude,
          longitude: longitude ?? existingPending.longitude,
          tokenHash,
          expiresAt: tokenExpiresAt,
          lastSentAt: new Date(),
        },
      });
    } else {
      await prisma.pendingRegistration.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          prayerCalculationMethod: prayerCalculationMethod || 'Karachi',
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          tokenHash,
          expiresAt: tokenExpiresAt,
          lastSentAt: new Date(),
        },
      });
    }

    // Clear any previous failed attempts
    clearOtpFailedAttempts(normalizedEmail);

    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret);
    const directApiUrl = `${config.appUrl}/api/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}&token=${otp}&otp=${otp}`;

    // 7. If email delivery failed, return 502 with honest diagnostic rather than swallowing the failure
    if (!emailResult.success) {
      console.warn(`[AuthController] Email delivery failure for ${normalizedEmail}: ${emailResult.error}`);
      return res.status(502).json({
        success: false,
        error: `Account created, but verification code could not be delivered (${emailResult.error || 'Email service connection error'}). Please verify email configuration or click Resend Code.`,
        code: 'EMAIL_DELIVERY_FAILED',
        requiresEmailVerification: true,
        requiresOtp: true,
        email: normalizedEmail,
        canResend: true,
        expiresIn: 300,
        ...(isAuthorizedTest ? { token: otp, devOtp: otp, previewUrl: directApiUrl, verificationUrl: directApiUrl } : {}),
      });
    }

    return res.status(201).json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your email.',
      requiresEmailVerification: true,
      requiresOtp: true,
      email: normalizedEmail,
      expiresIn: 300,
      ...(isAuthorizedTest ? { token: otp, devOtp: otp, previewUrl: directApiUrl, verificationUrl: directApiUrl } : {}),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Verify Email Token
 * GET /api/auth/verify-email?token=... or POST /api/auth/verify-email
 *
 * Rules:
 * - Validates single-use token against SHA-256 hash in PendingRegistration
 * - Enforces expiration (24h)
 * - Creates active user in User and deletes PendingRegistration atomically inside a transaction
 * - Issues JWT session cookie and responds with user or redirects to frontend
 */
export async function verifyEmail(req, res, next) {
  try {
    const rawToken = req.query.token || req.body.token || req.query.otp || req.body.otp;
    const isApiRequest = Boolean(
      req.xhr ||
      req.query.format === 'json' ||
      (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'))
    );
    const isBrowserRequest = req.method === 'GET' && !isApiRequest;
    const frontendUrl = getEffectiveFrontendUrl(req);

    if (!rawToken || typeof rawToken !== 'string') {
      if (isBrowserRequest) {
        return res.redirect(`${frontendUrl}/verify-email?verified=false&error=missing_token`);
      }
      return res.status(400).json({
        success: false,
        error: 'Verification token is missing. Please check the link in your email.',
        code: 'MISSING_TOKEN',
      });
    }

    // Compute SHA-256 hash of incoming token
    const tokenHash = hashVerificationToken(rawToken);

    // Atomically execute verification check and user activation inside a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Look up in PendingRegistration inside transaction
      let pendingTx = await tx.pendingRegistration.findUnique({
        where: { tokenHash },
      });

      if (!pendingTx) {
        // Check legacy User record
        const legacyUser = await tx.user.findFirst({
          where: { verificationTokenHash: tokenHash },
        });

        if (legacyUser) {
          if (legacyUser.tokenExpiresAt && new Date() > new Date(legacyUser.tokenExpiresAt)) {
            return { code: 'TOKEN_EXPIRED', email: legacyUser.email };
          }

          const verifiedUser = await tx.user.update({
            where: { id: legacyUser.id },
            data: {
              isEmailVerified: true,
              verificationTokenHash: null,
              tokenExpiresAt: null,
            },
          });

          return { code: 'SUCCESS', user: verifiedUser };
        }

        return { code: 'TOKEN_INVALID' };
      }

      // Check expiration
      if (new Date() > new Date(pendingTx.expiresAt)) {
        return { code: 'TOKEN_EXPIRED', email: pendingTx.email };
      }

      // Atomically delete pending record (guarantees single-use & eliminates race conditions)
      try {
        await tx.pendingRegistration.delete({
          where: { id: pendingTx.id },
        });
      } catch (delErr) {
        if (delErr.code === 'P2025') {
          return { code: 'TOKEN_INVALID' };
        }
        throw delErr;
      }

      // Concurrency safety: check if user was already created
      const existingUser = await tx.user.findUnique({
        where: { email: pendingTx.email },
      });

      let userRecord;
      if (existingUser) {
        userRecord = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            isEmailVerified: true,
            verificationTokenHash: null,
            tokenExpiresAt: null,
            ...(isPermanentAdmin(pendingTx.email) ? { role: 'ADMIN' } : {}),
          },
        });
      } else {
        userRecord = await tx.user.create({
          data: {
            name: pendingTx.name,
            email: pendingTx.email,
            password: pendingTx.password, // already bcrypt-hashed
            role: isPermanentAdmin(pendingTx.email) ? 'ADMIN' : 'USER',
            prayerCalculationMethod: pendingTx.prayerCalculationMethod || 'Karachi',
            latitude: pendingTx.latitude,
            longitude: pendingTx.longitude,
            isEmailVerified: true,
            verificationTokenHash: null,
            tokenExpiresAt: null,
            lastVerificationSentAt: null,
          },
        });
      }

      return { code: 'SUCCESS', user: userRecord };
    }, {
      maxWait: 15000,
      timeout: 25000,
    });

    if (result.code === 'TOKEN_EXPIRED') {
      if (isBrowserRequest) {
        return res.redirect(`${frontendUrl}/verify-email?verified=false&error=token_expired&email=${encodeURIComponent(result.email)}`);
      }
      return res.status(400).json({
        success: false,
        error: 'This verification code or link has expired. Please request a fresh 6-digit code.',
        code: 'TOKEN_EXPIRED',
        email: result.email,
      });
    }

    if (result.code === 'TOKEN_INVALID') {
      if (isBrowserRequest) {
        return res.redirect(`${frontendUrl}/verify-email?verified=false&error=invalid_or_used_token`);
      }
      return res.status(400).json({
        success: false,
        error: 'This verification code is invalid or has already been used. If your account is already verified, you can log in directly.',
        code: 'TOKEN_INVALID',
      });
    }

    const verifiedUser = result.user;
    const token = signToken(verifiedUser);
    setAuthCookie(res, token);

    // If request was from browser, redirect user directly to their app dashboard
    if (isBrowserRequest) {
      return res.redirect(`${frontendUrl}/verify-email?verified=true&token=${token}&email=${encodeURIComponent(verifiedUser.email)}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Your account has been activated.',
      email: verifiedUser.email,
      token,
      user: sanitizeUser(verifiedUser),
    });
  } catch (err) {
    if (err.code === 'P2025' || err.code === 'P2002' || err.code === 'P2034') {
      const isApiRequest = Boolean(
        req.xhr ||
        req.query.format === 'json' ||
        (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'))
      );
      const isBrowserRequest = req.method === 'GET' && !isApiRequest;
      const frontendUrl = getEffectiveFrontendUrl(req);
      if (isBrowserRequest) {
        return res.redirect(`${frontendUrl}/verify-email?verified=false&error=invalid_or_used_token`);
      }
      return res.status(400).json({
        success: false,
        error: 'This verification code is invalid or has already been used. If your account is already verified, you can log in directly.',
        code: 'TOKEN_INVALID',
      });
    }
    next(err);
  }
}

/**
 * 3. Resend Verification Email with Rate Limiting
 * POST /api/auth/resend-verification
 */
export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user is already verified in `User`
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'This email address is already verified! You can log in directly.',
        code: 'ALREADY_VERIFIED',
        email: user.email,
      });
    }

    // 2. Check PendingRegistration (primary) and unverified legacy User (secondary)
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending && !user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address. Please click "Create Account" to register.',
        code: 'ACCOUNT_NOT_FOUND',
        email: normalizedEmail,
      });
    }

    // Rate limiting: enforce cooldown between resend requests
    const lastSentAt = pending ? pending.lastSentAt : user.lastVerificationSentAt;
    if (lastSentAt) {
      const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
      const cooldownMs = config.verificationResendCooldownSec * 1000;
      if (elapsedMs < cooldownMs) {
        const retryAfterSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${retryAfterSec} seconds before requesting another verification email.`,
          code: 'RATE_LIMITED',
          retryAfter: retryAfterSec,
        });
      }
    }

    // Generate fresh single-use 6-digit numeric OTP with 5-minute strict TTL
    const { otp, tokenHash } = generateOtp();
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const recipientName = pending ? pending.name : user.name;

    // Send OTP verification email FIRST
    const emailResult = await sendOtpEmail(normalizedEmail, recipientName || 'Brother/Sister', otp);

    // Update pending registration or user with the fresh single-use token in the database
    if (pending) {
      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: {
          tokenHash,
          expiresAt: tokenExpiresAt,
          lastSentAt: new Date(),
        },
      });
    } else if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: tokenHash,
          tokenExpiresAt,
          lastVerificationSentAt: new Date(),
        },
      });
    }

    clearOtpFailedAttempts(normalizedEmail);
    const directApiUrl = `${config.appUrl}/api/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}&token=${otp}&otp=${otp}`;
    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret);

    if (!emailResult.success) {
      return res.status(502).json({
        success: false,
        error: emailResult.error || 'Failed to deliver verification email. Please verify your email configuration.',
        code: 'EMAIL_DELIVERY_FAILED',
        email: normalizedEmail,
        canResend: true,
        expiresIn: 300,
        ...(isAuthorizedTest ? { token: otp, devOtp: otp, previewUrl: directApiUrl, verificationUrl: directApiUrl } : {}),
      });
    }

    return res.status(200).json({
      success: true,
      message: `A fresh 6-digit verification code has been dispatched to ${normalizedEmail}. Please check your inbox.`,
      email: normalizedEmail,
      expiresIn: 300,
      canResend: false,
      cooldown: 60,
      ...(isAuthorizedTest ? { token: otp, devOtp: otp, previewUrl: directApiUrl, verificationUrl: directApiUrl } : {}),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Log in an existing user
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Actionable error if user registered via Google
      if (!user.password && user.googleId) {
        return res.status(400).json({
          success: false,
          error: 'This account was created using Google. Please click "Continue with Google" to sign in.',
          code: 'GOOGLE_ACCOUNT',
          email: normalizedEmail,
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect password. Please double-check your password and try again.',
          code: 'INVALID_PASSWORD',
          email: normalizedEmail,
        });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          error: 'Your email address is not verified yet. Please enter the 6-digit verification code sent to your inbox, or request a new code.',
          code: 'EMAIL_NOT_VERIFIED',
          requiresOtp: true,
          email: user.email,
        });
      }

      const token = signToken(user);
      setAuthCookie(res, token);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        user: sanitizeUser(user),
      });
    }

    // If not found in `User`, check if registration is pending verification
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (pending) {
      const isPasswordValid = await bcrypt.compare(password, pending.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect password. Please double-check your password and try again.',
          code: 'INVALID_PASSWORD',
          email: normalizedEmail,
        });
      }

      return res.status(403).json({
        success: false,
        error: 'Your email address is not verified yet. Please enter the 6-digit verification code sent to your inbox, or request a new code.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresOtp: true,
        email: normalizedEmail,
      });
    }

    // Constant-time compare to mitigate user enumeration timing attacks
    await bcrypt.compare(password, DUMMY_HASH);

    return res.status(404).json({
      success: false,
      error: 'No account found with this email address. Please click "Create Account" to register.',
      code: 'ACCOUNT_NOT_FOUND',
      email: normalizedEmail,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Initiate Google OAuth 2.0 Flow
 * GET /api/auth/google
 * Generates CSRF state, sets cookie, redirects to Google Accounts
 */
export async function initiateGoogleOAuth(req, res) {
  const state = crypto.randomBytes(32).toString('hex');
  const isProd = config.nodeEnv === 'production';

  // Store CSRF state in secure HttpOnly cookie (10 min expiry)
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });

  // Track the frontend origin that initiated the login (Cloudflare Workers, localhost, etc.)
  const referer = req.query.redirect_to || req.headers.referer;
  let frontendOrigin = getEffectiveFrontendUrl(req);
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (
        parsed.origin.endsWith('.workers.dev') ||
        parsed.origin.includes('salah-companion.mdsaif.workers.dev') ||
        parsed.origin.includes('localhost') ||
        parsed.origin.includes('127.0.0.1')
      ) {
        frontendOrigin = parsed.origin;
      }
    } catch {}
  }
  if (frontendOrigin.includes('netlify.app')) {
    frontendOrigin = 'https://salah-companion.mdsaif.workers.dev';
  }

  res.cookie('oauth_frontend', frontendOrigin, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });

  const redirectUri = getOAuthCallbackUrl(req);

  const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
    (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
    (req.query.test_secret && req.query.test_secret === config.jwtSecret);

  // If live Google Web Client ID is configured, redirect to Google Accounts
  if (config.googleClientId && config.googleClientId.includes('.apps.googleusercontent.com')) {
    const authUrl = getGoogleAuthUrl(state, redirectUri);
    return res.redirect(authUrl);
  }

  // Only during automated test suite execution with test signature, allow test callback
  if (isAuthorizedTest) {
    return res.redirect(`${redirectUri}?code=mock_google_oauth_code&state=${state}&test_secret=${encodeURIComponent(config.jwtSecret)}`);
  }

  // Google OAuth is not configured: strictly reject and redirect to login with actionable error
  return res.redirect(`${frontendOrigin}/login?auth_error=GOOGLE_NOT_CONFIGURED`);
}

/**
 * Helper to determine OAuth callback URL consistently
 * Dynamically resolves live host in cloud environments so stale env vars don't break OAuth
 */
export function getOAuthCallbackUrl(req) {
  const reqHost = req?.get ? req.get('host') : null;
  const isLocal = Boolean(reqHost && (reqHost.includes('localhost') || reqHost.includes('127.0.0.1')));
  const reqProto = (req?.headers && req.headers['x-forwarded-proto']) || req?.protocol || (isLocal ? 'http' : 'https');

  // 1. In local development, resolve local callback matching active server port
  if (isLocal) {
    if (config.googleCallbackUrl && (config.googleCallbackUrl.includes('localhost') || config.googleCallbackUrl.includes('127.0.0.1'))) {
      return config.googleCallbackUrl;
    }
    return `${reqProto}://${reqHost}/api/auth/google/callback`;
  }

  // 2. In cloud deployments (e.g. Render), ensure callback URL matches the active service host
  if (reqHost && config.googleCallbackUrl && config.googleCallbackUrl.includes(reqHost)) {
    return config.googleCallbackUrl;
  }
  if (reqHost) {
    return `${reqProto}://${reqHost}/api/auth/google/callback`;
  }

  if (config.googleCallbackUrl) {
    return config.googleCallbackUrl;
  }
  const baseUrl = config.appUrl ? config.appUrl.replace(/\/+$/, '') : 'http://localhost:8080';
  return `${baseUrl}/api/auth/google/callback`;
}

/**
 * 6. Google OAuth 2.0 Callback
 * GET /api/auth/google/callback
 * Validates CSRF state, exchanges code for user profile, sets HttpOnly cookie, redirects to dashboard
 */
export async function handleGoogleOAuthCallback(req, res) {
  const { code, state, error } = req.query;

  // Resolve target frontend origin
  let frontendBase = (req.cookies?.oauth_frontend || getEffectiveFrontendUrl(req)).replace(/\/+$/, '');
  if (frontendBase.includes('netlify.app')) {
    frontendBase = 'https://salah-companion.mdsaif.workers.dev';
  }
  res.clearCookie('oauth_frontend', { path: '/' });

  // Handle user cancellation or Google error
  if (error) {
    return res.redirect(`${frontendBase}/login?auth_error=${encodeURIComponent(String(error))}`);
  }

  // CSRF validation
  const savedState = req.cookies?.oauth_state;
  if (!savedState || savedState !== state) {
    if (!savedState && state && typeof state === 'string' && state.length === 64) {
      console.warn('[GoogleAuth] oauth_state cookie not attached by browser, falling back to query state');
    } else {
      return res.redirect(`${frontendBase}/login?auth_error=CSRF_STATE_MISMATCH`);
    }
  }

  // Clear CSRF state cookie
  res.clearCookie('oauth_state', { path: '/' });

  try {
    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.query.test_secret && req.query.test_secret === config.jwtSecret);

    const redirectUri = getOAuthCallbackUrl(req);
    const googleProfile = await getGoogleProfileFromCode(code, redirectUri, isAuthorizedTest);
    const { email, name, googleId, picture, emailVerified } = googleProfile;

    if (!emailVerified) {
      return res.redirect(`${frontendBase}/login?auth_error=EMAIL_NOT_VERIFIED`);
    }

    // Check if user exists with googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email.toLowerCase() },
        ],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatarUrl: picture || user.avatarUrl,
          isEmailVerified: true,
          ...(isPermanentAdmin(email) ? { role: 'ADMIN' } : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          googleId,
          avatarUrl: picture,
          password: null,
          isEmailVerified: true,
          prayerCalculationMethod: 'Karachi',
          role: isPermanentAdmin(email) ? 'ADMIN' : 'USER',
        },
      });
    }

    // Issue JWT and set secure HttpOnly cookie
    const token = signToken(user);
    setAuthCookie(res, token);

    // Redirect authenticated user to frontend dashboard with token for seamless cross-domain & mobile authorization
    return res.redirect(`${frontendBase}/app?auth=google_success&token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[GoogleAuth] Callback error:', err.message);
    const errCode = err.message?.includes('GOOGLE_NOT_CONFIGURED')
      ? 'GOOGLE_NOT_CONFIGURED'
      : (err.message || 'AUTH_FAILED');
    return res.redirect(`${frontendBase}/login?auth_error=${encodeURIComponent(errCode)}`);
  }
}

/**
 * 7. Google OAuth 2.0 Sign-In & Sign-Up (Direct / Popup / GIS API)
 * POST /api/auth/google
 */
export async function googleAuth(req, res, next) {
  try {
    const { credential, prayerCalculationMethod, latitude, longitude } = req.body;

    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.body?.testSecret && req.body?.testSecret === config.jwtSecret);

    const googleProfile = await verifyGoogleToken(credential, isAuthorizedTest);
    const { email, name, googleId, picture, emailVerified } = googleProfile;

    if (!emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Your Google account email is not verified by Google.',
      });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email.toLowerCase() },
        ],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatarUrl: picture || user.avatarUrl,
          isEmailVerified: true,
          ...(isPermanentAdmin(email) ? { role: 'ADMIN' } : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          googleId,
          avatarUrl: picture,
          password: null,
          isEmailVerified: true,
          prayerCalculationMethod: prayerCalculationMethod || 'Karachi',
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          role: isPermanentAdmin(email) ? 'ADMIN' : 'USER',
        },
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Signed in with Google successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 8. Log out current user (Clears HttpOnly Cookie)
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

/**
 * 9. Fetch current authenticated user profile
 * GET /api/auth/me (Protected via protectRoute)
 */
export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
}

/**
 * 10. Update authenticated user preferences
 * PATCH /api/auth/profile (Protected via protectRoute)
 */
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, prayerCalculationMethod, latitude, longitude } = req.body;

    const dataToUpdate = {};
    if (typeof name !== 'undefined') dataToUpdate.name = name;
    if (typeof prayerCalculationMethod !== 'undefined') dataToUpdate.prayerCalculationMethod = prayerCalculationMethod;
    if (typeof latitude !== 'undefined') dataToUpdate.latitude = latitude;
    if (typeof longitude !== 'undefined') dataToUpdate.longitude = longitude;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 11. Diagnostic SMTP Email Health Check
 * GET /api/auth/email-health
 */
export async function getEmailHealth(req, res) {
  try {
    const health = await verifyEmailTransport();
    if (health.connected) {
      return res.status(200).json({
        success: true,
        connected: true,
        provider: health.provider || config.emailService,
        from: config.emailFrom,
        message: 'Email transport verified and operational.',
      });
    } else {
      return res.status(503).json({
        success: false,
        connected: false,
        error: health.error,
        provider: health.provider || config.emailService,
        from: config.emailFrom,
        recommendation: process.env.RENDER
          ? 'Render free web services block standard outbound SMTP ports (25, 465, 587). Please add BREVO_API_KEY or RESEND_API_KEY to your Render Environment Variables to send transactional emails via HTTPS (port 443).'
          : 'Please check your SMTP credentials or configure an HTTP email API key (BREVO_API_KEY or RESEND_API_KEY).',
      });
    }
  } catch (err) {
    return res.status(503).json({
      success: false,
      connected: false,
      error: err.message,
    });
  }
}

/**
 * 12. Forgot Password Request
 * POST /api/auth/forgot-password
 *
 * Rules:
 * - Anti-enumeration: returns generic 200 OK whether user exists or not
 * - Generates secure single-use 32-byte crypto token, stores SHA-256 hash in database
 * - Sets 1-hour expiration
 * - Sends password reset email
 * - Rate-limited cooldown (60 seconds)
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Anti-enumeration protection: never reveal whether the email exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Rate-limiting: prevent spamming reset requests (60 seconds cooldown)
    if (user.resetPasswordExpiresAt) {
      const msLeft = new Date(user.resetPasswordExpiresAt).getTime() - Date.now();
      // Token was created with 1h (3600000ms). If > 3540000ms remain, it was created < 60s ago
      if (msLeft > 3540000) {
        const retryAfterSec = Math.ceil((msLeft - 3540000) / 1000);
        return res.status(429).json({
          success: false,
          error: `A password reset link was recently requested. Please check your inbox or wait ${retryAfterSec} seconds.`,
          code: 'RATE_LIMITED',
          retryAfter: retryAfterSec,
        });
      }
    }

    // Generate secure random single-use token and SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashVerificationToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    const clientOrigin = getEffectiveFrontendUrl(req);
    const emailResult = await sendPasswordResetEmail(normalizedEmail, user.name, rawToken, clientOrigin);

    if (!emailResult.success) {
      console.warn(`[AuthController] Password reset email delivery failed for ${normalizedEmail}: ${emailResult.error}`);
      return res.status(502).json({
        success: false,
        error: `Password reset requested, but the email delivery failed (${emailResult.error || 'SMTP delivery rejected'}). Please verify your email configuration.`,
        code: 'EMAIL_DELIVERY_FAILED',
        previewUrl: emailResult.previewUrl,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      previewUrl: emailResult.previewUrl,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 13. Reset Password Using Token
 * POST /api/auth/reset-password
 *
 * Rules:
 * - Validates single-use token against SHA-256 hash in database
 * - Enforces expiration (1 hour)
 * - Hashes new password with bcrypt (salt rounds = 12)
 * - Clears token hash (single-use)
 * - Issues JWT session cookie and automatically logs user in
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Reset token is required.',
        code: 'MISSING_TOKEN',
      });
    }

    const tokenHash = hashVerificationToken(token);
    const user = await prisma.user.findFirst({
      where: { resetPasswordTokenHash: tokenHash },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'This password reset link is invalid or has already been used. Please request a new link.',
        code: 'INVALID_RESET_TOKEN',
      });
    }

    if (user.resetPasswordExpiresAt && new Date() > new Date(user.resetPasswordExpiresAt)) {
      return res.status(400).json({
        success: false,
        error: 'This password reset link has expired (links are valid for 1 hour). Please request a new link.',
        code: 'TOKEN_EXPIRED',
        email: user.email,
      });
    }

    // Hash new password with bcrypt (salt rounds = 12)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        isEmailVerified: true, // Resetting password via email token confirms email ownership
      },
    });

    const authToken = signToken(updatedUser);
    setAuthCookie(res, authToken);

    return res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset. You are now logged in.',
      token: authToken,
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 14. Set or Change Password for Authenticated User
 * POST /api/auth/set-password (Protected via protectRoute)
 *
 * Rules:
 * - If user does not have a password yet (Google OAuth user), allows setting without current password
 * - If user already has a password, requires and verifies current password
 * - Hashes new password with bcrypt (salt rounds = 12)
 */
export async function setPassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { password, currentPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    // If user already has a password, verify current password
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password is required to change your password.',
          code: 'CURRENT_PASSWORD_REQUIRED',
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect.',
          code: 'INCORRECT_CURRENT_PASSWORD',
        });
      }
    }

    // Hash new password with bcrypt (salt rounds = 12)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(200).json({
      success: true,
      message: user.password ? 'Password changed successfully.' : 'Password created successfully. You can now log in using either Google or your email and password.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Check whether an email registration has been verified
 * GET /api/auth/status?email=...
 */
export async function checkEmailStatus(req, res, next) {
  try {
    const email = req.query.email || req.body?.email;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email parameter required', code: 'MISSING_EMAIL' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, isEmailVerified: true },
    });

    if (user && user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Email is verified.',
        user: { id: user.id, name: user.name, email: user.email },
      });
    }

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, expiresAt: true },
    });

    return res.status(200).json({
      success: true,
      verified: false,
      pending: Boolean(pending),
      expired: pending ? new Date() > new Date(pending.expiresAt) : false,
      message: pending ? 'Verification pending.' : 'No account found with this email.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Timing-attack-safe comparison of two hex hashes
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeCompareHash(a, b) {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  try {
    const bufA = Buffer.from(a.trim(), 'hex');
    const bufB = Buffer.from(b.trim(), 'hex');
    if (bufA.length !== 32 || bufB.length !== 32) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * 16. Verify 6-digit numeric OTP code
 * POST /api/auth/verify-otp
 *
 * Enforces:
 * - 6-digit format check
 * - 5-attempt sliding lockout (15 minutes)
 * - 5-minute expiration check
 * - Cryptographic SHA-256 timing-safe hash comparison
 * - Atomic transaction activation & cleanup (prevents replay attacks)
 * - Sets secure HttpOnly session cookie and returns user
 */
export async function verifyOtp(req, res, next) {
  try {
    const email = req.body?.email || req.query?.email;
    const otp = req.body?.otp || req.query?.otp;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.',
        code: 'MISSING_EMAIL',
      });
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 6-digit verification code.',
        code: 'INVALID_OTP_FORMAT',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    // 1. Check lockout status
    const attemptStatus = getOtpAttemptStatus(normalizedEmail);
    if (attemptStatus.locked) {
      return res.status(429).json({
        success: false,
        error: `Too many failed verification attempts. Please wait ${attemptStatus.retryAfterSec} seconds before trying again.`,
        code: 'OTP_LOCKED',
        retryAfter: attemptStatus.retryAfterSec,
      });
    }

    const inputHash = hashVerificationToken(cleanOtp);

    // Atomically execute verification check and user activation inside a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Priority 1: Check PendingRegistration
      const pendingTx = await tx.pendingRegistration.findUnique({
        where: { email: normalizedEmail },
      });

      if (pendingTx) {
        // Expiration check (5 minutes strict TTL)
        if (new Date() > new Date(pendingTx.expiresAt)) {
          return { code: 'OTP_EXPIRED', email: normalizedEmail };
        }

        // Timing-safe SHA-256 hash check
        const isMatch = safeCompareHash(pendingTx.tokenHash, inputHash);

        if (!isMatch) {
          return { code: 'OTP_MISMATCH', recordId: pendingTx.id, type: 'pending' };
        }

        // Atomically delete pending record to prevent replay
        await tx.pendingRegistration.delete({
          where: { id: pendingTx.id },
        });

        // Upsert into User
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
        });

        let userRecord;
        if (existingUser) {
          userRecord = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              isEmailVerified: true,
              verificationTokenHash: null,
              tokenExpiresAt: null,
              lastVerificationSentAt: null,
              ...(isPermanentAdmin(normalizedEmail) ? { role: 'ADMIN' } : {}),
            },
          });
        } else {
          userRecord = await tx.user.create({
            data: {
              name: pendingTx.name,
              email: pendingTx.email,
              password: pendingTx.password,
              role: isPermanentAdmin(pendingTx.email) ? 'ADMIN' : 'USER',
              prayerCalculationMethod: pendingTx.prayerCalculationMethod || 'Karachi',
              latitude: pendingTx.latitude,
              longitude: pendingTx.longitude,
              isEmailVerified: true,
              verificationTokenHash: null,
              tokenExpiresAt: null,
              lastVerificationSentAt: null,
            },
          });
        }

        return { code: 'SUCCESS', user: userRecord };
      }

      // Priority 2: Check User table (for existing unverified users or passwordless OTP)
      const userTx = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (userTx) {
        if (!userTx.verificationTokenHash) {
          if (userTx.isEmailVerified) {
            return { code: 'ALREADY_VERIFIED', user: userTx };
          }
          return { code: 'NO_ACTIVE_OTP' };
        }

        // Expiry check
        if (userTx.tokenExpiresAt && new Date() > new Date(userTx.tokenExpiresAt)) {
          return { code: 'OTP_EXPIRED', email: normalizedEmail };
        }

        // Timing-safe SHA-256 hash check
        const isMatch = safeCompareHash(userTx.verificationTokenHash, inputHash);

        if (!isMatch) {
          return { code: 'OTP_MISMATCH', recordId: userTx.id, type: 'user' };
        }

        const updatedUser = await tx.user.update({
          where: { id: userTx.id },
          data: {
            isEmailVerified: true,
            verificationTokenHash: null,
            tokenExpiresAt: null,
            lastVerificationSentAt: null,
          },
        });

        return { code: 'SUCCESS', user: updatedUser };
      }

      return { code: 'ACCOUNT_NOT_FOUND' };
    }, {
      maxWait: 15000,
      timeout: 25000,
    });

    // Handle results
    if (result.code === 'OTP_MISMATCH') {
      const failStatus = recordFailedOtpAttempt(normalizedEmail);
      if (failStatus.locked) {
        // Invalidate DB token to eliminate any further brute force window
        try {
          if (result.type === 'pending') {
            await prisma.pendingRegistration.update({
              where: { id: result.recordId },
              data: { expiresAt: new Date(0) },
            });
          } else {
            await prisma.user.update({
              where: { id: result.recordId },
              data: { tokenExpiresAt: new Date(0) },
            });
          }
        } catch {}

        return res.status(429).json({
          success: false,
          error: 'Too many incorrect attempts. This code has been invalidated for security. Please wait 15 minutes before requesting a new code.',
          code: 'OTP_LOCKED',
          remainingAttempts: 0,
          retryAfter: failStatus.retryAfterSec,
        });
      }

      return res.status(400).json({
        success: false,
        error: `Incorrect verification code. You have ${failStatus.remaining} attempt${failStatus.remaining === 1 ? '' : 's'} remaining.`,
        code: 'OTP_INVALID',
        remainingAttempts: failStatus.remaining,
        email: normalizedEmail,
      });
    }

    if (result.code === 'OTP_EXPIRED') {
      return res.status(400).json({
        success: false,
        error: 'This verification code has expired (codes are valid for 5 minutes). Please request a new code.',
        code: 'OTP_EXPIRED',
        email: result.email,
      });
    }

    if (result.code === 'ALREADY_VERIFIED') {
      return res.status(400).json({
        success: false,
        error: 'This account is already verified or this verification code has already been used.',
        code: 'ALREADY_VERIFIED',
        email: normalizedEmail,
      });
    }

    if (result.code === 'NO_ACTIVE_OTP') {
      return res.status(400).json({
        success: false,
        error: 'No active verification code found for this account. Please click Resend Code to receive a new one.',
        code: 'NO_ACTIVE_OTP',
        email: normalizedEmail,
      });
    }

    if (result.code === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'No account or registration request found for this email address. Please register first.',
        code: 'ACCOUNT_NOT_FOUND',
        email: normalizedEmail,
      });
    }

    // Success! Clear failed attempts
    clearOtpFailedAttempts(normalizedEmail);

    const verifiedUser = result.user;
    const token = signToken(verifiedUser);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to Salah Companion.',
      token,
      user: sanitizeUser(verifiedUser),
    });
  } catch (err) {
    if (err.code === 'P2025' || err.code === 'P2002' || err.code === 'P2034') {
      return res.status(400).json({
        success: false,
        error: 'This verification code is invalid or has already been used. If your account is already verified, you can log in directly.',
        code: 'ALREADY_VERIFIED',
      });
    }
    next(err);
  }
}

/**
 * 17. Send / Resend 6-digit numeric OTP code
 * POST /api/auth/send-otp and POST /api/auth/resend-otp
 *
 * Rules:
 * - Checks lockout status (15 min after 5 failed attempts)
 * - Checks 60-second cooldown
 * - Dispatches 6-digit numeric OTP with 5-minute TTL via configured email provider
 * - Timing-safe mitigation against account enumeration
 */
export async function sendOtp(req, res, next) {
  try {
    const email = req.body?.email || req.query?.email;
    const type = req.body?.type || 'VERIFICATION';

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.',
        code: 'MISSING_EMAIL',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check lockout
    const attemptStatus = getOtpAttemptStatus(normalizedEmail);
    if (attemptStatus.locked) {
      return res.status(429).json({
        success: false,
        error: `Too many attempts. Please wait ${attemptStatus.retryAfterSec} seconds before requesting another code.`,
        code: 'OTP_LOCKED',
        retryAfter: attemptStatus.retryAfterSec,
      });
    }

    // 1. Check PendingRegistration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    // 2. Check User table
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const targetRecord = pending || user;

    if (!targetRecord) {
      // Mitigate account enumeration timing attack
      await bcrypt.compare('dummy_timing_protection', DUMMY_HASH);
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email address, a 6-digit verification code has been dispatched.',
        code: 'OTP_DISPATCHED',
        email: normalizedEmail,
        expiresIn: 300,
      });
    }

    // Check resend cooldown (60 seconds)
    const lastSentAt = pending ? pending.lastSentAt : user.lastVerificationSentAt;
    if (lastSentAt) {
      const elapsedMs = Date.now() - new Date(lastSentAt).getTime();
      const cooldownMs = config.verificationResendCooldownSec * 1000;
      if (elapsedMs < cooldownMs) {
        const retryAfterSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${retryAfterSec} seconds before requesting another verification code.`,
          code: 'RATE_LIMITED',
          retryAfter: retryAfterSec,
        });
      }
    }

    // Generate fresh 6-digit OTP
    const { otp, tokenHash } = generateOtp();
    const tokenExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute strict TTL
    const recipientName = targetRecord.name || 'Brother/Sister';

    // Send email first
    const emailResult = await sendOtpEmail(normalizedEmail, recipientName, otp);

    // Update DB record
    if (pending) {
      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: {
          tokenHash,
          expiresAt: tokenExpiresAt,
          lastSentAt: new Date(),
        },
      });
    } else if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationTokenHash: tokenHash,
          tokenExpiresAt,
          lastVerificationSentAt: new Date(),
        },
      });
    }

    // Clear failed attempts counter for fresh OTP
    clearOtpFailedAttempts(normalizedEmail);

    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret);

    if (!emailResult.success) {
      console.warn(`[AuthController] OTP dispatch failed for ${normalizedEmail}: ${emailResult.error}`);
      return res.status(502).json({
        success: false,
        error: emailResult.error || 'Failed to dispatch verification email. Please check email service configuration.',
        code: 'EMAIL_DELIVERY_FAILED',
        email: normalizedEmail,
        ...(isAuthorizedTest ? { devOtp: otp } : {}),
      });
    }

    return res.status(200).json({
      success: true,
      message: `A fresh 6-digit verification code has been dispatched to ${normalizedEmail}.`,
      code: 'OTP_SENT',
      email: normalizedEmail,
      expiresIn: 300,
      ...(isAuthorizedTest ? { devOtp: otp } : {}),
    });
  } catch (err) {
    next(err);
  }
}
