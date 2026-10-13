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
 * 8. Handler for retired email-based authentication endpoints
 * Returns 410 Gone ensuring no old email-login endpoint remains active
 */
export function handleRetiredEmailAuth(req, res) {
  if (req.method === 'GET') {
    const frontendUrl = getEffectiveFrontendUrl(req);
    return res.redirect(`${frontendUrl}/login?notice=use_google`);
  }
  return res.status(410).json({
    success: false,
    error: 'Email-based login and verification have been retired. Please sign in with Google.',
    code: 'EMAIL_AUTH_RETIRED',
  });
}
