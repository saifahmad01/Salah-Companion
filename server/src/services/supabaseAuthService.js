/**
 * Supabase Auth OTP Service
 *
 * Uses Supabase's built-in Auth system to send and verify 6-digit email OTPs.
 * Supabase delivers emails over HTTPS (port 443) — immune to Render's SMTP port blocking.
 *
 * Flow:
 *   sendSupabaseOtp(email)   → Supabase sends OTP email to user
 *   verifySupabaseOtp(email, token) → Supabase validates the code; returns { success, error }
 *
 * We do NOT use Supabase for session/user management — we keep our own JWT + Prisma User table.
 * Supabase Auth is used purely as a reliable email-delivery and token-verification vehicle.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || config.supabaseUrl;
}
function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey;
}
function getSupabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || config.supabaseAnonKey;
}

// Admin client — used for verifyOtp server-side (service role bypasses RLS)
let adminClient = null;
// Public client — used for signInWithOtp (sends the email)
let anonClient = null;

function getAdminClient() {
  if (!adminClient) {
    const url = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();
    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use Supabase Auth OTP.'
      );
    }
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return adminClient;
}

function getAnonClient() {
  if (!anonClient) {
    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    if (!url || !anonKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_ANON_KEY must be set to use Supabase Auth OTP.'
      );
    }
    anonClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return anonClient;
}

/**
 * Returns true if Supabase Auth OTP is properly configured.
 */
export function isSupabaseOtpConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey() && getSupabaseAnonKey());
}

/**
 * Sends a 6-digit OTP to the given email via Supabase Auth.
 * Supabase handles email delivery using their own infrastructure (HTTPS, no SMTP ports).
 *
 * @param {string} email - Recipient email address
 * @returns {{ success: boolean, error?: string }}
 */
export async function sendSupabaseOtp(email) {
  try {
    const supabase = getAnonClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Do NOT create a Supabase auth user — we manage users in our own DB
        shouldCreateUser: true,
        // We override the email template in the Supabase dashboard (optional)
      },
    });

    if (error) {
      console.error(`[SupabaseAuth] Failed to send OTP to ${email}:`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[SupabaseAuth] OTP sent successfully to ${email} via Supabase`);
    return { success: true };
  } catch (err) {
    console.error(`[SupabaseAuth] Unexpected error sending OTP to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verifies a 6-digit OTP token submitted by the user against Supabase Auth.
 *
 * @param {string} email - The user's email address
 * @param {string} token - The 6-digit OTP entered by the user
 * @returns {{ success: boolean, error?: string }}
 */
export async function verifySupabaseOtp(email, token) {
  try {
    const supabase = getAnonClient();
    const cleanToken = String(token).trim();

    // 1. Try type: 'email' (standard for signInWithOtp)
    let { data, error } = await supabase.auth.verifyOtp({
      email,
      token: cleanToken,
      type: 'email',
    });

    // 2. If invalid/expired with type 'email', fallback to type 'signup' (in case user was new signup)
    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('not found')) {
        const signupRes = await supabase.auth.verifyOtp({
          email,
          token: cleanToken,
          type: 'signup',
        });
        if (!signupRes.error) {
          data = signupRes.data;
          error = null;
        }
      }
    }

    if (error) {
      console.error(`[SupabaseAuth] OTP verification failed for ${email}:`, error.message);

      // Map Supabase error messages to our standard codes
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('not found')) {
        return { success: false, error: 'OTP_INVALID_OR_EXPIRED' };
      }
      if (msg.includes('rate') || msg.includes('too many')) {
        return { success: false, error: 'RATE_LIMITED' };
      }
      return { success: false, error: error.message };
    }

    console.log(`[SupabaseAuth] OTP verified successfully for ${email}`);
    return { success: true, session: data?.session, user: data?.user };
  } catch (err) {
    console.error(`[SupabaseAuth] Unexpected error verifying OTP for ${email}:`, err.message);
    return { success: false, error: err.message };
  }
}
