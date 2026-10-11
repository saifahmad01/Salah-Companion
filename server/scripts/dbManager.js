import { prisma } from '../src/db/prisma.js';
import { query } from '../src/db/connection.js';

const command = process.argv[2] || 'list';
const targetEmail = process.argv[3];

async function main() {
  console.log('====================================================');
  console.log('🛠️  Salah Companion Development Database Manager');
  console.log('====================================================\n');

  switch (command.toLowerCase()) {
    case 'list': {
      console.log('📋 Active Users in Database:');
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isEmailVerified: true,
          prayerCalculationMethod: true,
          createdAt: true,
          _count: {
            select: { prayerLogs: true, deedLogs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (users.length === 0) {
        console.log('  No registered users found.');
      } else {
        console.table(
          users.map((u) => ({
            ID: u.id.slice(0, 8) + '...',
            Name: u.name,
            Email: u.email,
            Role: u.role,
            Verified: u.isEmailVerified ? '✅ Yes' : '❌ No',
            Method: u.prayerCalculationMethod,
            PrayerLogs: u._count.prayerLogs,
            DeedLogs: u._count.deedLogs,
            Created: u.createdAt.toISOString().slice(0, 10),
          }))
        );
      }

      console.log('\n⏳ Pending Registrations (Awaiting Email Verification):');
      const pending = await prisma.pendingRegistration.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          prayerCalculationMethod: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (pending.length === 0) {
        console.log('  No pending registrations.');
      } else {
        console.table(
          pending.map((p) => ({
            Email: p.email,
            Name: p.name,
            Expires: p.expiresAt.toISOString(),
            Created: p.createdAt.toISOString(),
          }))
        );
      }
      break;
    }

    case 'delete': {
      if (!targetEmail) {
        console.error('❌ Please specify an email to delete: node scripts/dbManager.js delete <email>');
        process.exit(1);
      }
      const normEmail = targetEmail.trim().toLowerCase();

      // Check users table
      const user = await prisma.user.findUnique({ where: { email: normEmail } });
      if (user) {
        await prisma.user.delete({ where: { email: normEmail } });
        console.log(`✅ Successfully deleted user: ${normEmail} (and all associated prayer/deed logs).`);
      } else {
        console.log(`ℹ️  No user record found in 'users' with email: ${normEmail}`);
      }

      // Check pending registrations
      const pending = await prisma.pendingRegistration.findUnique({ where: { email: normEmail } });
      if (pending) {
        await prisma.pendingRegistration.delete({ where: { email: normEmail } });
        console.log(`✅ Successfully removed pending registration for: ${normEmail}`);
      }
      break;
    }

    case 'verify': {
      if (!targetEmail) {
        console.error('❌ Please specify an email to verify: node scripts/dbManager.js verify <email>');
        process.exit(1);
      }
      const normEmail = targetEmail.trim().toLowerCase();

      // If pending, promote to active
      const pending = await prisma.pendingRegistration.findUnique({ where: { email: normEmail } });
      if (pending) {
        await prisma.$transaction([
          prisma.user.upsert({
            where: { email: normEmail },
            update: { isEmailVerified: true },
            create: {
              name: pending.name,
              email: pending.email,
              password: pending.password,
              role: 'USER',
              isEmailVerified: true,
              prayerCalculationMethod: pending.prayerCalculationMethod || 'Karachi',
              latitude: pending.latitude,
              longitude: pending.longitude,
            },
          }),
          prisma.pendingRegistration.delete({ where: { email: normEmail } }),
        ]);
        console.log(`✅ Successfully converted pending registration to verified active User: ${normEmail}`);
      } else {
        const user = await prisma.user.findUnique({ where: { email: normEmail } });
        if (!user) {
          console.error(`❌ No user or pending registration found with email: ${normEmail}`);
          process.exit(1);
        }
        await prisma.user.update({
          where: { email: normEmail },
          data: { isEmailVerified: true, verificationTokenHash: null, tokenExpiresAt: null },
        });
        console.log(`✅ Marked user as email verified: ${normEmail}`);
      }
      break;
    }

    case 'make-admin': {
      if (!targetEmail) {
        console.error('❌ Please specify an email: node scripts/dbManager.js make-admin <email>');
        process.exit(1);
      }
      const normEmail = targetEmail.trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email: normEmail } });
      if (!user) {
        console.error(`❌ User not found: ${normEmail}`);
        process.exit(1);
      }
      await prisma.user.update({
        where: { email: normEmail },
        data: { role: 'ADMIN', isEmailVerified: true },
      });
      console.log(`👑 SUCCESS: User ${normEmail} has been granted the ADMIN role!`);
      break;
    }

    case 'clear-test': {
      console.log('🧹 Cleaning up automated test accounts (*@example.com, *+autotest*, test_user_*)...');
      const delPending = await query(`
        DELETE FROM pending_registrations 
        WHERE email LIKE '%@example.com' 
           OR email LIKE '%+autotest%' 
           OR email LIKE '%testuser%'
      `);
      const delUsers = await query(`
        DELETE FROM users 
        WHERE email LIKE '%@example.com' 
           OR email LIKE '%+autotest%' 
           OR email LIKE '%testuser%'
           OR id LIKE 'test_user_%'
      `);
      console.log(`✅ Removed ${delUsers.rowCount} test users and ${delPending.rowCount} test pending registrations.`);
      break;
    }

    case 'reset-logs': {
      if (!targetEmail) {
        console.error('❌ Please specify an email: node scripts/dbManager.js reset-logs <email>');
        process.exit(1);
      }
      const normEmail = targetEmail.trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email: normEmail } });
      if (!user) {
        console.error(`❌ User not found: ${normEmail}`);
        process.exit(1);
      }
      const deletedLogs = await prisma.prayerLog.deleteMany({ where: { userId: user.id } });
      const deletedDeeds = await prisma.deedLog.deleteMany({ where: { userId: user.id } });
      console.log(`✅ Cleared ${deletedLogs.count} prayer logs and ${deletedDeeds.count} deed logs for user: ${normEmail}`);
      break;
    }

    default:
      console.log(`
Commands available:
  node scripts/dbManager.js list                 - List all users and pending registrations
  node scripts/dbManager.js verify <email>       - Manually mark a user as verified
  node scripts/dbManager.js delete <email>       - Delete a user or pending record
  node scripts/dbManager.js reset-logs <email>   - Clear all prayer logs for a user
  node scripts/dbManager.js clear-test           - Clear automated test accounts
      `);
      break;
  }
}

main()
  .catch((err) => {
    console.error('Database Manager Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
