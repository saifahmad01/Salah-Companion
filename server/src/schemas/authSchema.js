import { z } from 'zod';

/**
 * Strong password rule:
 * - At least 8 characters
 * - Must contain at least one letter and one number
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
export const calculationMethodEnum = z.enum([
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
 * Google OAuth Authentication Schema
 */
export const googleAuthSchema = z.object({
  credential: z.string({ required_error: 'Google credential/token is required' }).min(1),
  prayerCalculationMethod: calculationMethodEnum.optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

/**
 * Set/Change Password Validation Schema (for authenticated profile management)
 */
export const setPasswordSchema = z.object({
  password: passwordValidation,
  currentPassword: z.string().optional(),
});

/**
 * Request OTP Validation Schema
 */
export const sendOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address'),
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

/**
 * Verify OTP Validation Schema
 */
export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address'),
  otp: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain digits only'),
});

/**
 * Resend OTP Validation Schema
 */
export const resendOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .email('Please enter a valid email address'),
});

