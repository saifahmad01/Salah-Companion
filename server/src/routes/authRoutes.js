import { Router } from 'express';
import {
  googleAuth,
  initiateGoogleOAuth,
  handleGoogleOAuthCallback,
  logout,
  getMe,
  updateProfile,
  setPassword,
  sendOtp,
  verifyOtp,
  resendOtp,
  handleRetiredEmailAuth,
} from '../controllers/authController.js';
import {
  protectRoute,
  validateBody,
} from '../middlewares/authMiddleware.js';
import {
  otpSendRateLimiter,
  otpVerifyRateLimiter,
} from '../middlewares/rateLimiter.js';
import {
  googleAuthSchema,
  updateProfileSchema,
  setPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from '../schemas/authSchema.js';

export const authRouter = Router();

// ============================================================================
// 1. Email + 6-Digit OTP Authentication (Brevo SMTP & REST API)
// ============================================================================
authRouter.post('/send-otp', otpSendRateLimiter, validateBody(sendOtpSchema), sendOtp);
authRouter.post('/verify-otp', otpVerifyRateLimiter, validateBody(verifyOtpSchema), verifyOtp);
authRouter.post('/resend-otp', otpSendRateLimiter, validateBody(resendOtpSchema), resendOtp);

// Backwards-compatible aliases: submitting email to /login or /register triggers OTP
authRouter.post('/login', otpSendRateLimiter, validateBody(sendOtpSchema), sendOtp);
authRouter.post('/register', otpSendRateLimiter, validateBody(sendOtpSchema), sendOtp);

// ============================================================================
// 2. Google OAuth 2.0 / OpenID Connect Authentication
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
// 3. Retired Link-Based Email Verification Endpoints
// Returns HTTP 410 Gone informing clients that verification links are replaced with 6-digit OTP
// ============================================================================
const retiredPaths = [
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
