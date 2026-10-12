import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  googleAuth,
  initiateGoogleOAuth,
  handleGoogleOAuthCallback,
  logout,
  getMe,
  updateProfile,
  getEmailHealth,
  forgotPassword,
  resetPassword,
  setPassword,
} from '../controllers/authController.js';
import {
  protectRoute,
  validateBody,
} from '../middlewares/authMiddleware.js';
import {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  googleAuthSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setPasswordSchema,
} from '../schemas/authSchema.js';

export const authRouter = Router();

// Public Authentication Routes
authRouter.post('/register', validateBody(registerSchema), register);
authRouter.post('/login', validateBody(loginSchema), login);
authRouter.get('/verify-email', verifyEmail);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', validateBody(resendVerificationSchema), resendVerification);
authRouter.get('/email-health', getEmailHealth);

// Password Reset Routes
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);

// Google OAuth 2.0 / OpenID Connect Routes
authRouter.get('/google', initiateGoogleOAuth);
authRouter.get('/google/callback', handleGoogleOAuthCallback);
authRouter.post('/google', validateBody(googleAuthSchema), googleAuth);

// Session / Logout
authRouter.post('/logout', logout);

// Protected routes (Protected via protectRoute: checks HttpOnly cookie or Bearer token)
authRouter.get('/me', protectRoute, getMe);
authRouter.patch('/profile', protectRoute, validateBody(updateProfileSchema), updateProfile);
authRouter.post('/set-password', protectRoute, validateBody(setPasswordSchema), setPassword);

