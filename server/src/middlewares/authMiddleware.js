import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';

const JWT_SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret_for_dev_only_change_in_production';

/**
 * Validates request body against a given Zod schema
 * @param {import('zod').ZodSchema} schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      const primaryMessage = errorMessages[0]?.message || 'Validation Error';
      return res.status(400).json({
        success: false,
        error: primaryMessage,
        code: 'VALIDATION_ERROR',
        details: errorMessages,
      });
    }
    req.body = result.data; // Attach sanitized and coerced data
    next();
  };
}

/**
 * Validates request query parameters against a given Zod schema
 * @param {import('zod').ZodSchema} schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => ({
        parameter: issue.path.join('.') || 'query',
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Query Parameter Validation Error',
        details: errorMessages,
      });
    }
    req.query = result.data; // Attach sanitized and coerced data
    next();
  };
}

/**
 * Authentication Middleware (protectRoute)
 * Extracts Bearer token, verifies JWT, ensures user exists, attaches to req.user
 */
export async function protectRoute(req, res, next) {
  try {
    let token;

    // 1. Extract token from HttpOnly cookie first, then Bearer Authorization header
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. You must be logged in to access this resource.',
        code: 'UNAUTHORIZED',
      });
    }

    // 2. Verify JWT signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Your session has expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      if (jwtErr.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token. Please log in again.',
          code: 'TOKEN_INVALID',
        });
      }
      throw jwtErr;
    }

    // 3. Verify user still exists in the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        googleId: true,
        avatarUrl: true,
        prayerCalculationMethod: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'The account belonging to this token no longer exists.',
        code: 'USER_NOT_FOUND',
      });
    }

    // 4. Attach sanitized user to request context
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-Based Access Control Middleware (restrictTo)
 * Restricts access to specific user roles
 * @param {...string} roles Allowed roles ('ADMIN', 'USER')
 */
export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You do not have permission to perform this action.',
        requiredRoles: roles,
      });
    }
    next();
  };
}

/**
 * Optional Authentication Middleware
 * Attaches user if valid token exists, but does not block unauthenticated requests
 */
export function optionalAuth(req, res, next) {
  try {
    let token;
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
      } catch {}
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Require Verified Email Middleware
 * Prevents unverified accounts from accessing protected resources
 */
export function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in first.',
      code: 'UNAUTHORIZED',
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Please verify your email address to access this feature.',
      code: 'EMAIL_NOT_VERIFIED',
      email: req.user.email,
    });
  }

  next();
}
