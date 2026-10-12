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
  checkEmailStatus,
  verifyOtp,
  sendOtp,
} from '../controllers/authController.js';
import {
  protectRoute,
  validateBody,
  requireVerifiedEmail,
} from '../middlewares/authMiddleware.js';
import {
  registerIpRateLimiter,
  resendHourlyRateLimiter,
} from '../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  googleAuthSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setPasswordSchema,
  verifyOtpSchema,
  sendOtpSchema,
} from '../schemas/authSchema.js';

export const authRouter = Router();

// Public Authentication Routes
authRouter.post('/register', registerIpRateLimiter, validateBody(registerSchema), register);
authRouter.post('/login', validateBody(loginSchema), login);
authRouter.post('/verify-otp', validateBody(verifyOtpSchema), verifyOtp);
authRouter.post('/send-otp', resendHourlyRateLimiter, validateBody(sendOtpSchema), sendOtp);
authRouter.post('/resend-otp', resendHourlyRateLimiter, validateBody(sendOtpSchema), sendOtp);
authRouter.get('/verify-email', verifyEmail);
authRouter.post('/verify-email', verifyEmail);
authRouter.post('/resend-verification', resendHourlyRateLimiter, validateBody(resendVerificationSchema), resendVerification);
authRouter.get('/status', checkEmailStatus);
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
authRouter.patch('/profile', protectRoute, requireVerifiedEmail, validateBody(updateProfileSchema), updateProfile);
authRouter.post('/set-password', protectRoute, requireVerifiedEmail, validateBody(setPasswordSchema), setPassword);

