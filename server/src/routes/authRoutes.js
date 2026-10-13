import { Router } from 'express';
import {
  googleAuth,
  initiateGoogleOAuth,
  handleGoogleOAuthCallback,
  logout,
  getMe,
  updateProfile,
  setPassword,
  handleRetiredEmailAuth,
} from '../controllers/authController.js';
import {
  protectRoute,
  validateBody,
} from '../middlewares/authMiddleware.js';
import {
  googleAuthSchema,
  updateProfileSchema,
  setPasswordSchema,
} from '../schemas/authSchema.js';

export const authRouter = Router();

// ============================================================================
// Google OAuth 2.0 / OpenID Connect Authentication
// ============================================================================
authRouter.get('/google', initiateGoogleOAuth);
authRouter.get('/google/callback', handleGoogleOAuthCallback);
authRouter.post('/google', validateBody(googleAuthSchema), googleAuth);

// Session / Logout
authRouter.post('/logout', logout);

// Protected routes (Protected via protectRoute: checks HttpOnly cookie or Bearer token)
authRouter.get('/me', protectRoute, getMe);
authRouter.patch('/profile', protectRoute, validateBody(updateProfileSchema), updateProfile);
authRouter.post('/set-password', protectRoute, validateBody(setPasswordSchema), setPassword);

// ============================================================================
// Retired Email-Based Authentication Endpoints
// Returns HTTP 410 Gone ensuring no old email-login endpoint remains active
// ============================================================================
const retiredPaths = [
  '/login',
  '/register',
  '/verify-otp',
  '/send-otp',
  '/resend-otp',
  '/verify-email',
  '/resend-verification',
  '/status',
  '/email-health',
  '/forgot-password',
  '/reset-password',
];

retiredPaths.forEach((path) => {
  authRouter.all(path, handleRetiredEmailAuth);
});
