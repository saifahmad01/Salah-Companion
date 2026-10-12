/**
 * Permanent System Administrator Configuration
 *
 * These accounts are guaranteed to permanently exist with role 'ADMIN'
 * and verified email status. They cannot be demoted or deleted.
 */

export const PERMANENT_ADMIN_EMAILS = Object.freeze([
  'mdsaifahmad78@gmail.com',
  'mdsaiahmad78@gmail.com',
]);

/**
 * Checks if a given email is a permanent system administrator
 * @param {string} [email]
 * @returns {boolean}
 */
export function isPermanentAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return PERMANENT_ADMIN_EMAILS.includes(normalized);
}
