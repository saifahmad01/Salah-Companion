import { Router } from 'express';
import {
  register,
  login,
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
// Legacy Magic Link Retirement (Redirect to OTP Login)
authRouter.get('/verify-email', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
  const target = isProd ? 'https://salah-companion.mdsaif.workers.dev/login?notice=use_otp' : 'http://localhost:5173/login?notice=use_otp';
  return res.redirect(target);
});
authRouter.post('/verify-email', (req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Verification links have been retired. Please sign in using your 6-digit email OTP.',
    code: 'OBSOLETE_VERIFICATION_LINK',
  });
});
authRouter.post('/resend-verification', resendHourlyRateLimiter, validateBody(sendOtpSchema), sendOtp);
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

