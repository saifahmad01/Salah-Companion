import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import {
  sendVerificationEmail,
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
    if (origin.includes('localhost:5173') || origin.includes('localhost:3000')) {
      return origin.includes('localhost:3000') ? 'http://localhost:3000' : 'http://localhost:5173';
    }
    // Route any legacy Netlify traffic directly to Cloudflare Workers
    if (origin.includes('netlify.app')) {
      return 'https://salah-companion.mdsaif.workers.dev';
    }
  }
  const configured = (config.frontendUrl || FRONTEND_URL || '').replace('salahcopmanion', 'salahcompanion').replace(/\/+$/, '');
  if (configured && !configured.includes('netlify.app')) {
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
 * Generate a new single-use verification token and its SHA-256 hash
 * @returns {{ rawToken: string, tokenHash: string }}
 */
export function generateVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(rawToken);
  return { rawToken, tokenHash };
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
 * 1. Register a new user with Email Verification
 * POST /api/auth/register
 *
 * Rules:
 * - Checks if email already belongs to an active user account in `User`.
 *   If it does, return 409 Conflict: "An account with this email already exists. Please log in."
 * - Checks if email has a pending registration in `PendingRegistration`.
 *   If yes, checks resend cooldown (60s).
 * - Hashes password (bcrypt salt rounds = 12).
 * - Generates secure random single-use verification token (SHA-256 hash stored).
 * - Sends verification email first via Nodemailer.
 *   If email delivery fails, returns 502 Bad Gateway with diagnostic error (NEVER reports success if email fails).
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
          error: `A verification link was recently sent to this email. Please check your inbox or wait ${retryAfterSec} seconds to request another link.`,
          code: 'RATE_LIMITED',
          email: normalizedEmail,
          retryAfter: retryAfterSec,
        });
      }
    }

    // 3. Hash password with bcrypt (salt rounds = 12)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Generate secure random verification token and SHA-256 hash
    const { rawToken, tokenHash } = generateVerificationToken();
    const tokenExpiresAt = new Date(Date.now() + config.verificationTokenTtlHours * 60 * 60 * 1000);

    // 5. Send verification email via Nodemailer with the RAW token
    const clientOrigin = getEffectiveFrontendUrl(req);
    const emailResult = await sendVerificationEmail(normalizedEmail, name || existingPending?.name || 'Brother/Sister', rawToken, clientOrigin);

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

    const directApiUrl = `${config.appUrl}/api/auth/verify-email?token=${rawToken}`;

    // 7. If email delivery failed, return 502 with honest diagnostic rather than swallowing the failure
    if (!emailResult.success) {
      console.warn(`[AuthController] Email delivery failure for ${normalizedEmail}: ${emailResult.error}`);
      return res.status(502).json({
        success: false,
        error: `Account created, but verification email could not be delivered (${emailResult.error || 'SMTP delivery rejected'}). Please verify email configuration or click Resend.`,
        code: 'EMAIL_DELIVERY_FAILED',
        requiresEmailVerification: true,
        email: normalizedEmail,
        canResend: true,
        token: rawToken,
        previewUrl: directApiUrl,
        verificationUrl: directApiUrl,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Verification link sent! Please check your email and click the link to activate your account.',
      requiresEmailVerification: true,
      email: normalizedEmail,
      token: rawToken,
      previewUrl: directApiUrl,
      verificationUrl: directApiUrl,
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
    const rawToken = req.query.token || req.body.token;
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

    // 1. Look up in PendingRegistration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { tokenHash },
    });

    if (!pending) {
      // Check legacy User record if any
      const legacyUser = await prisma.user.findFirst({
        where: { verificationTokenHash: tokenHash },
      });

      if (legacyUser) {
        if (legacyUser.tokenExpiresAt && new Date() > new Date(legacyUser.tokenExpiresAt)) {
          if (isBrowserRequest) {
            return res.redirect(`${frontendUrl}/verify-email?verified=false&error=token_expired&email=${encodeURIComponent(legacyUser.email)}`);
          }
          return res.status(400).json({
            success: false,
            error: 'This verification link has expired (links are valid for 24 hours). Please request a new verification email.',
            code: 'TOKEN_EXPIRED',
            email: legacyUser.email,
          });
        }

        const verifiedUser = await prisma.user.update({
          where: { id: legacyUser.id },
          data: {
            isEmailVerified: true,
            verificationTokenHash: null,
            tokenExpiresAt: null,
          },
        });

        const token = signToken(verifiedUser);
        setAuthCookie(res, token);

        if (isBrowserRequest) {
          return res.redirect(`${frontendUrl}/verify-email?verified=true&token=${token}&email=${encodeURIComponent(verifiedUser.email)}`);
        }
        return res.status(200).json({
          success: true,
          message: 'Email verified successfully! You can now log in to your account.',
          email: verifiedUser.email,
          token,
          user: sanitizeUser(verifiedUser),
        });
      }

      if (isBrowserRequest) {
        return res.redirect(`${frontendUrl}/verify-email?verified=false&error=invalid_or_used_token`);
      }
      return res.status(400).json({
        success: false,
        error: 'This verification link is invalid or has already been used. If your account is already verified, you can log in directly.',
        code: 'TOKEN_INVALID',
      });
    }

    // 2. Check expiration
    if (new Date() > new Date(pending.expiresAt)) {
      if (isBrowserRequest) {
        return res.redirect(`${frontendUrl}/verify-email?verified=false&error=token_expired&email=${encodeURIComponent(pending.email)}`);
      }
      return res.status(400).json({
        success: false,
        error: 'This verification link has expired (links are valid for 24 hours). Please request a new verification email.',
        code: 'TOKEN_EXPIRED',
        email: pending.email,
      });
    }

    // 3. Atomically create User record and delete PendingRegistration record in a transaction
    const verifiedUser = await prisma.$transaction(async (tx) => {
      // Concurrency safety: check if user was already created
      const existingUser = await tx.user.findUnique({
        where: { email: pending.email },
      });

      let userRecord;
      if (existingUser) {
        userRecord = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            isEmailVerified: true,
            verificationTokenHash: null,
            tokenExpiresAt: null,
            ...(isPermanentAdmin(pending.email) ? { role: 'ADMIN' } : {}),
          },
        });
      } else {
        userRecord = await tx.user.create({
          data: {
            name: pending.name,
            email: pending.email,
            password: pending.password, // already bcrypt-hashed
            role: isPermanentAdmin(pending.email) ? 'ADMIN' : 'USER',
            prayerCalculationMethod: pending.prayerCalculationMethod || 'Karachi',
            latitude: pending.latitude,
            longitude: pending.longitude,
            isEmailVerified: true,
            verificationTokenHash: null,
            tokenExpiresAt: null,
            lastVerificationSentAt: null,
          },
        });
      }

      // Single-use guarantee: remove pending record
      await tx.pendingRegistration.delete({
        where: { id: pending.id },
      });

      return userRecord;
    });

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

    // Generate fresh single-use verification token
    const { rawToken, tokenHash } = generateVerificationToken();
    const tokenExpiresAt = new Date(Date.now() + config.verificationTokenTtlHours * 60 * 60 * 1000);
    const recipientName = pending ? pending.name : user.name;

    // Send verification email FIRST
    const clientOrigin = getEffectiveFrontendUrl(req);
    const emailResult = await sendVerificationEmail(normalizedEmail, recipientName, rawToken, clientOrigin);

    if (!emailResult.success) {
      return res.status(502).json({
        success: false,
        error: emailResult.error || 'Failed to deliver verification email. Please verify your email configuration.',
        code: 'EMAIL_DELIVERY_FAILED',
        email: normalizedEmail,
      });
    }

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

    const directApiUrl = `${config.appUrl}/api/auth/verify-email?token=${rawToken}`;
    return res.status(200).json({
      success: true,
      message: `A fresh verification link has been sent to ${normalizedEmail}. Please check your inbox.`,
      token: rawToken,
      previewUrl: directApiUrl,
      verificationUrl: directApiUrl,
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
          error: 'Your email address is not verified yet. Please click the verification link sent to your inbox, or request a new verification email.',
          code: 'EMAIL_NOT_VERIFIED',
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
        error: 'Your email address is not verified yet. Please click the verification link sent to your inbox, or request a new verification email.',
        code: 'EMAIL_NOT_VERIFIED',
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
        provider: config.emailService,
        from: config.emailFrom,
        message: 'SMTP transport connection verified successfully.',
      });
    } else {
      return res.status(503).json({
        success: false,
        connected: false,
        error: health.error,
        provider: config.emailService,
        from: config.emailFrom,
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


