import { z } from 'zod';

/**
 * Strong password rule:
 * - At least 8 characters
 * - Must contain at least one uppercase or lowercase letter
 * - Must contain at least one digit
 */
const passwordValidation = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password cannot exceed 100 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

/**
 * Allowed prayer calculation methods
 */
const calculationMethodEnum = z.enum([
  'Karachi',
  'MWL',
  'MuslimWorldLeague',
  'ISNA',
  'NorthAmerica',
  'Egypt',
  'Egyptian',
  'Makkah',
  'UmmAlQura',
  'Dubai',
  'Qatar',
  'Kuwait',
  'Turkey',
  'Singapore',
  'MoonsightingCommittee'
]);

/**
 * Robust email validation:
 * - RFC 5322 syntax
 * - Must include valid domain with TLD (e.g. .com, .org, .net)
 */
const emailValidation = z
  .string({ required_error: 'Email address is required' })
  .trim()
  .toLowerCase()
  .min(5, 'Email address must be at least 5 characters')
  .max(100, 'Email address cannot exceed 100 characters')
  .email('Please enter a valid email address (e.g. yourname@gmail.com)')
  .refine(
    (val) => {
      const parts = val.split('@');
      if (parts.length !== 2) return false;
      const domain = parts[1];
      return domain.includes('.') && domain.split('.').pop().length >= 2;
    },
    { message: 'Please enter a valid email domain (e.g. yourname@gmail.com)' }
  );

/**
 * Registration Input Validation Schema
 */
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters'),
  email: emailValidation,
  password: passwordValidation,
  prayerCalculationMethod: calculationMethodEnum.default('Karachi').optional(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
});

/**
 * Login Input Validation Schema
 */
export const loginSchema = z.object({
  email: emailValidation,
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Profile Update Validation Schema
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .optional(),
  prayerCalculationMethod: calculationMethodEnum.optional(),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .nullable()
    .optional(),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .nullable()
    .optional(),
});

/**
 * Resend Verification Email Schema
 */
export const resendVerificationSchema = z.object({
  email: emailValidation,
});

/**
 * Google OAuth Authentication Schema
 */
export const googleAuthSchema = z.object({
  credential: z.string({ required_error: 'Google credential/token is required' }).min(1),
  prayerCalculationMethod: calculationMethodEnum.optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

/**
 * Forgot Password Input Validation Schema
 */
export const forgotPasswordSchema = z.object({
  email: emailValidation,
});

/**
 * Reset Password Input Validation Schema
 */
export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
  password: passwordValidation,
});

/**
 * Set/Change Password Validation Schema (for Google OAuth or existing users)
 */
export const setPasswordSchema = z.object({
  password: passwordValidation,
  currentPassword: z.string().optional(),
});

/**
 * OTP Verification Input Validation Schema
 */
export const verifyOtpSchema = z.object({
  email: emailValidation,
  otp: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain digits only'),
});

/**
 * OTP Send / Resend Input Validation Schema
 */
export const sendOtpSchema = z.object({
  email: emailValidation,
  type: z.enum(['VERIFICATION', 'LOGIN']).optional(),
});



