import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
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
  registerIpRateLimiter,
  authIpRateLimiter,
  otpSendRateLimiter,
  otpVerifyRateLimiter,
} from '../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  updateProfileSchema,
  setPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from '../schemas/authSchema.js';

export const authRouter = Router();

// ============================================================================
// 1. Production-Ready Email + Password Authentication (Amazon / Flipkart UX)
// ============================================================================
authRouter.post('/register', registerIpRateLimiter, validateBody(registerSchema), register);
authRouter.post('/login', authIpRateLimiter, validateBody(loginSchema), login);
authRouter.post('/forgot-password', authIpRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', authIpRateLimiter, validateBody(resetPasswordSchema), resetPassword);

// ============================================================================
// 2. Email + 6-Digit OTP Authentication (Brevo SMTP & REST API)
// ============================================================================
authRouter.post('/send-otp', otpSendRateLimiter, validateBody(sendOtpSchema), sendOtp);
authRouter.post('/verify-otp', otpVerifyRateLimiter, validateBody(verifyOtpSchema), verifyOtp);
authRouter.post('/resend-otp', otpSendRateLimiter, validateBody(resendOtpSchema), resendOtp);

// ============================================================================
// 3. Google OAuth 2.0 / OpenID Connect Authentication
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
// 4. Retired Link-Based Email Verification Endpoints
// Returns HTTP 410 Gone informing clients that verification links are replaced
// ============================================================================
const retiredPaths = [
  '/verify-email',
  '/resend-verification',
  '/status',
  '/email-health',
];

retiredPaths.forEach((path) => {
  authRouter.all(path, handleRetiredEmailAuth);
});
