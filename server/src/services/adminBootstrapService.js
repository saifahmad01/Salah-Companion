import { prisma } from '../db/prisma.js';
import { PERMANENT_ADMIN_EMAILS } from '../constants/admins.js';

/**
 * Ensures all permanent administrators exist in the database with role 'ADMIN'
 * and verified email status. Automatically executed on server boot and also
 * callable via administration scripts.
 */
export async function ensurePermanentAdmins() {
  try {
    // Look up password hash from existing admin account if available
    const primaryAdmin = await prisma.user.findFirst({
      where: {
        email: {
          in: [...PERMANENT_ADMIN_EMAILS],
        },
        password: { not: null },
      },
    });

    const fallbackPassword = primaryAdmin?.password || null;

    for (const email of PERMANENT_ADMIN_EMAILS) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Guarantee ADMIN role and email verified status
        const needsUpdate =
          existingUser.role !== 'ADMIN' ||
          !existingUser.isEmailVerified ||
          (!existingUser.password && fallbackPassword);

        if (needsUpdate) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              role: 'ADMIN',
              isEmailVerified: true,
              ...(existingUser.password ? {} : fallbackPassword ? { password: fallbackPassword } : {}),
            },
          });
          console.log(`[AdminBootstrap] Synchronized permanent admin privileges for: ${email}`);
        }
      } else {
        // Create permanent admin record
        await prisma.user.create({
          data: {
            name: email.startsWith('mdsaif') ? 'Md Saif Ahmad' : 'Saif Ahmad',
            email,
            password: fallbackPassword,
            role: 'ADMIN',
            isEmailVerified: true,
            prayerCalculationMethod: 'Karachi',
          },
        });
        console.log(`[AdminBootstrap] Created permanent admin account: ${email}`);
      }

      // Also clean up any lingering pending registrations for this admin email
      await prisma.pendingRegistration.deleteMany({
        where: { email },
      });
    }
  } catch (error) {
    console.error('[AdminBootstrap] Failed to verify permanent administrators:', error.message);
  }
}
