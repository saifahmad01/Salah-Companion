import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import {
  verifyGoogleToken,
  getGoogleAuthUrl,
  getGoogleProfileFromCode,
} from '../services/googleAuthService.js';
import { config } from '../config/env.js';
import { isPermanentAdmin } from '../constants/admins.js';
import { otpService } from '../services/otpService.js';
import { brevoEmailService } from '../services/email/brevoEmailService.js';

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
 * Helper to determine OAuth callback URL consistently
 */
export function getOAuthCallbackUrl(req) {
  const reqHost = req?.get ? req.get('host') : null;
  const isLocal = Boolean(reqHost && (reqHost.includes('localhost') || reqHost.includes('127.0.0.1')));
  const reqProto = (req?.headers && req.headers['x-forwarded-proto']) || req?.protocol || (isLocal ? 'http' : 'https');

  if (isLocal) {
    if (config.googleCallbackUrl && (config.googleCallbackUrl.includes('localhost') || config.googleCallbackUrl.includes('127.0.0.1'))) {
      return config.googleCallbackUrl;
    }
    return `${reqProto}://${reqHost}/api/auth/google/callback`;
  }

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
 * Helper to generate signed JWT token
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

/**
 * Strips sensitive data from user before sending to client
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const {
    password: _pw,
    verificationTokenHash: _vth,
    tokenExpiresAt: _tea,
    lastVerificationSentAt: _lvsa,
    resetPasswordTokenHash: _rpth,
    resetPasswordExpiresAt: _rpea,
    ...safeUser
  } = user;
  return safeUser;
}

/**
 * 1. Initiate Google OAuth 2.0 Flow
 * GET /api/auth/google
 */
export async function initiateGoogleOAuth(req, res) {
  const state = crypto.randomBytes(32).toString('hex');
  const isProd = config.nodeEnv === 'production';

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  });

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

  if (config.googleClientId && config.googleClientId.includes('.apps.googleusercontent.com')) {
    const authUrl = getGoogleAuthUrl(state, redirectUri);
    return res.redirect(authUrl);
  }

  if (isAuthorizedTest) {
    return res.redirect(`${redirectUri}?code=mock_google_oauth_code&state=${state}&test_secret=${encodeURIComponent(config.jwtSecret)}`);
  }

  return res.redirect(`${frontendOrigin}/login?auth_error=GOOGLE_NOT_CONFIGURED`);
}

/**
 * 2. Google OAuth 2.0 Callback
 * GET /api/auth/google/callback
 */
export async function handleGoogleOAuthCallback(req, res) {
  const { code, state, error } = req.query;

  let frontendBase = (req.cookies?.oauth_frontend || getEffectiveFrontendUrl(req)).replace(/\/+$/, '');
  if (frontendBase.includes('netlify.app')) {
    frontendBase = 'https://salah-companion.mdsaif.workers.dev';
  }
  res.clearCookie('oauth_frontend', { path: '/' });

  if (error) {
    return res.redirect(`${frontendBase}/login?auth_error=${encodeURIComponent(String(error))}`);
  }

  const savedState = req.cookies?.oauth_state;
  if (!savedState || savedState !== state) {
    if (!savedState && state && typeof state === 'string' && state.length === 64) {
      console.warn('[GoogleAuth] oauth_state cookie not attached, falling back to query state');
    } else {
      return res.redirect(`${frontendBase}/login?auth_error=CSRF_STATE_MISMATCH`);
    }
  }

  res.clearCookie('oauth_state', { path: '/' });

  try {
    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.query.test_secret && req.query.test_secret === config.jwtSecret);

    const redirectUri = getOAuthCallbackUrl(req);
    const googleProfile = await getGoogleProfileFromCode(code, redirectUri, isAuthorizedTest);
    const { email, name, googleId, picture } = googleProfile;

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

    const token = signToken(user);
    setAuthCookie(res, token);

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
 * 3. Google OAuth 2.0 Sign-In & Sign-Up (Direct API)
 * POST /api/auth/google
 */
export async function googleAuth(req, res, next) {
  try {
    const { credential, prayerCalculationMethod, latitude, longitude } = req.body;

    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.body?.testSecret && req.body?.testSecret === config.jwtSecret);

    const googleProfile = await verifyGoogleToken(credential, isAuthorizedTest);
    const { email, name, googleId, picture } = googleProfile;

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
 * 4. Log out current user (Clears HttpOnly Cookie)
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
 * 5. Fetch current authenticated user profile
 * GET /api/auth/me (Protected via protectRoute)
 */
export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: sanitizeUser(req.user),
  });
}

/**
 * 6. Update authenticated user preferences
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
 * 7. Set or Change Password for Authenticated User Profile
 * POST /api/auth/set-password (Protected via protectRoute)
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
      message: 'Password saved successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 8. Request 6-Digit OTP via Brevo
 * POST /api/auth/send-otp
 */
export async function sendOtp(req, res, next) {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.',
        code: 'EMAIL_REQUIRED',
      });
    }

    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.body?.testSecret && req.body?.testSecret === config.jwtSecret);

    const result = await otpService.requestOtp({ email, name, isAuthorizedTest });
    return res.status(200).json(result);
  } catch (err) {
    if (err.code === 'RESEND_COOLDOWN') {
      return res.status(429).json({
        success: false,
        error: err.message,
        code: 'RESEND_COOLDOWN',
        retryAfter: err.retryAfter,
      });
    }
    console.error('[AuthController] sendOtp error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to send verification code. Please check email configuration.',
      code: 'SEND_OTP_FAILED',
    });
  }
}

/**
 * 9. Verify 6-Digit OTP and Log In
 * POST /api/auth/verify-otp
 */
export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and 6-digit verification code are required.',
        code: 'MISSING_FIELDS',
      });
    }

    const result = await otpService.verifyOtp({ email, otp });
    const user = result.user;

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    if (err.code === 'OTP_MISMATCH') {
      return res.status(400).json({
        success: false,
        error: err.message,
        code: 'OTP_MISMATCH',
        remainingAttempts: err.remainingAttempts,
      });
    }
    if (err.code === 'OTP_MAX_ATTEMPTS_EXCEEDED') {
      return res.status(403).json({
        success: false,
        error: err.message,
        code: 'OTP_MAX_ATTEMPTS_EXCEEDED',
      });
    }
    if (err.code === 'OTP_EXPIRED') {
      return res.status(400).json({
        success: false,
        error: err.message,
        code: 'OTP_EXPIRED',
      });
    }
    if (err.code === 'NO_ACTIVE_OTP' || err.code === 'INVALID_OTP_FORMAT') {
      return res.status(400).json({
        success: false,
        error: err.message,
        code: err.code,
      });
    }
    console.error('[AuthController] verifyOtp error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Verification failed. Please try again.',
      code: 'VERIFY_OTP_FAILED',
    });
  }
}

/**
 * 10. Resend 6-Digit OTP via Brevo
 * POST /api/auth/resend-otp
 */
export async function resendOtp(req, res, next) {
  return sendOtp(req, res, next);
}

/**
 * 11. Initiate Registration with Email + Password & Brevo 6-Digit OTP Verification
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, prayerCalculationMethod, latitude, longitude } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.',
        code: 'USER_ALREADY_EXISTS',
      });
    }

    // 2. Check 60-second cooldown on pending registration
    const existingPending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    const now = Date.now();
    if (existingPending && existingPending.lastSentAt) {
      const elapsed = now - new Date(existingPending.lastSentAt).getTime();
      if (elapsed < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
          code: 'RESEND_COOLDOWN',
          retryAfter: remainingSeconds,
        });
      }
    }

    // 3. Pre-hash password with bcrypt (salt rounds: 12)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Generate 6-digit OTP and store HMAC-SHA256 hash
    const otp = otpService.generateOtp();
    const otpHash = otpService.hashOtp(otp);
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes
    const tokenHashValue = `${otpHash}:0:${now}`; // hash:failedAttempts:timestamp

    await prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      update: {
        name: name.trim(),
        password: hashedPassword,
        prayerCalculationMethod: prayerCalculationMethod || 'Karachi',
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        tokenHash: tokenHashValue,
        expiresAt,
        lastSentAt: new Date(now),
      },
      create: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        prayerCalculationMethod: prayerCalculationMethod || 'Karachi',
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        tokenHash: tokenHashValue,
        expiresAt,
        lastSentAt: new Date(now),
      },
    });

    // 5. Send OTP verification email via Brevo
    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.body?.testSecret && req.body?.testSecret === config.jwtSecret);

    try {
      await brevoEmailService.sendOtpEmail({
        to: normalizedEmail,
        name: name.trim(),
        otp,
        expiresInMinutes: 5,
        isAuthorizedTest,
      });
    } catch (err) {
      console.error(`[AuthController] Registration OTP delivery error:`, err.message);
      return res.status(500).json({
        success: false,
        error: `Failed to deliver verification code to ${normalizedEmail}. ${err.message}`,
        code: 'SEND_OTP_FAILED',
      });
    }

    const responsePayload = {
      success: true,
      requiresVerification: true,
      message: 'A 6-digit verification code has been sent to your email. Please verify to complete account creation.',
      email: normalizedEmail,
      expiresInSeconds: 300,
      cooldownSeconds: 60,
    };

    if (isAuthorizedTest) {
      responsePayload.testOtp = otp;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
}

/**
 * 11b. Verify 6-Digit OTP and Complete Registration
 * POST /api/auth/register-verify
 */
export async function registerVerify(req, res, next) {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Fetch pending registration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      return res.status(400).json({
        success: false,
        error: 'No pending registration found for this email. Please submit the sign up form first.',
        code: 'NO_PENDING_REGISTRATION',
      });
    }

    // 2. Check expiration (5 minutes)
    if (new Date() > new Date(pending.expiresAt)) {
      return res.status(400).json({
        success: false,
        error: 'Your verification code has expired. Please request a new code.',
        code: 'OTP_EXPIRED',
      });
    }

    // 3. Verify OTP code with attempt limiting (max 5 attempts)
    const parts = pending.tokenHash.split(':');
    const storedHash = parts[0];
    const attempts = parseInt(parts[1], 10) || 0;
    const isMatch = otpService.verifyHash(otp, storedHash);

    if (!isMatch) {
      const newAttempts = attempts + 1;
      if (newAttempts >= 5) {
        await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } }).catch(() => {});
        return res.status(403).json({
          success: false,
          error: 'Too many incorrect attempts. Please sign up again.',
          code: 'OTP_MAX_ATTEMPTS_EXCEEDED',
        });
      }
      await prisma.pendingRegistration.update({
        where: { email: normalizedEmail },
        data: { tokenHash: `${storedHash}:${newAttempts}:${Date.now()}` },
      });
      return res.status(400).json({
        success: false,
        error: `Invalid verification code. ${5 - newAttempts} attempts remaining.`,
        code: 'OTP_MISMATCH',
        remainingAttempts: 5 - newAttempts,
      });
    }

    // 4. Create official verified user record in database
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.password,
        prayerCalculationMethod: pending.prayerCalculationMethod,
        latitude: pending.latitude,
        longitude: pending.longitude,
        isEmailVerified: true,
        role: isPermanentAdmin(pending.email) ? 'ADMIN' : 'USER',
      },
    });

    // 5. Clean up pending registration
    await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } }).catch(() => {});

    // 6. Issue JWT session token + HttpOnly cookie
    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account verified and created successfully. Welcome to Salah Companion!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 11c. Resend Registration 6-Digit OTP via Brevo
 * POST /api/auth/register-resend
 */
export async function registerResend(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      return res.status(400).json({
        success: false,
        error: 'No pending registration found for this email. Please submit the sign up form first.',
        code: 'NO_PENDING_REGISTRATION',
      });
    }

    const now = Date.now();
    if (pending.lastSentAt) {
      const elapsed = now - new Date(pending.lastSentAt).getTime();
      if (elapsed < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
          code: 'RESEND_COOLDOWN',
          retryAfter: remainingSeconds,
        });
      }
    }

    const otp = otpService.generateOtp();
    const hash = otpService.hashOtp(otp);
    const expiresAt = new Date(now + 5 * 60 * 1000);

    await prisma.pendingRegistration.update({
      where: { email: normalizedEmail },
      data: {
        tokenHash: `${hash}:0:${now}`,
        expiresAt,
        lastSentAt: new Date(now),
      },
    });

    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.body?.testSecret && req.body?.testSecret === config.jwtSecret);

    await brevoEmailService.sendOtpEmail({
      to: normalizedEmail,
      name: pending.name,
      otp,
      expiresInMinutes: 5,
      isAuthorizedTest,
    });

    const responsePayload = {
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      email: normalizedEmail,
      cooldownSeconds: 60,
      expiresInSeconds: 300,
    };

    if (isAuthorizedTest) {
      responsePayload.testOtp = otp;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
}

/**
 * 12. Log in with Email + Password
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'This account was created using Google Sign-In. Please sign in with Google.',
        code: 'GOOGLE_ACCOUNT_ONLY',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 13. Initiate Forgot Password flow
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // To prevent account enumeration, return standard response if user doesn't exist
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email address, password reset instructions have been sent.',
      });
    }

    // Generate secure 32-byte hex token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordTokenHash: resetTokenHash,
        resetPasswordExpiresAt: resetExpiresAt,
      },
    });

    const frontendUrl = getEffectiveFrontendUrl(req);
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    const isAuthorizedTest = (process.env.NODE_ENV === 'test') ||
      (req.headers['x-test-secret'] && req.headers['x-test-secret'] === config.jwtSecret) ||
      (req.body?.testSecret && req.body?.testSecret === config.jwtSecret);

    try {
      await brevoEmailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: 60,
        isAuthorizedTest,
      });
    } catch (emailErr) {
      console.warn(`[AuthController] Failed to send password reset email: ${emailErr.message}`);
      // In local development or test mode, provide safe preview if email fails
      if (process.env.NODE_ENV !== 'production' || isAuthorizedTest) {
        return res.status(200).json({
          success: true,
          message: 'Password reset link generated (email delivery bypassed in development).',
          resetToken,
          resetUrl,
        });
      }
    }

    const responsePayload = {
      success: true,
      message: 'If an account exists with that email address, password reset instructions have been sent.',
    };

    if (isAuthorizedTest) {
      responsePayload.resetToken = resetToken;
      responsePayload.resetUrl = resetUrl;
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
}

/**
 * 14. Complete Password Reset
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const resetPasswordTokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordTokenHash,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Password reset link is invalid or has expired. Please request a new one.',
        code: 'INVALID_OR_EXPIRED_TOKEN',
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
    });

    const sessionToken = signToken(updatedUser);
    setAuthCookie(res, sessionToken);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You are now logged in.',
      token: sessionToken,
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 15. Handler for retired legacy authentication links
 * Returns 410 Gone informing clients that legacy links are retired
 */
export function handleRetiredEmailAuth(req, res) {
  if (req.method === 'GET') {
    const frontendUrl = getEffectiveFrontendUrl(req);
    return res.redirect(`${frontendUrl}/login`);
  }
  return res.status(410).json({
    success: false,
    error: 'Old email verification links are retired. Please use Email + Password or 6-digit OTP login.',
    code: 'EMAIL_AUTH_RETIRED',
  });
}

