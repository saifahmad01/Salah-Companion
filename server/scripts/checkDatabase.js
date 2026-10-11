import { config } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { checkDbHealth } from '../src/db/connection.js';

async function main() {
  console.log('====================================================');
  console.log('🔍 Checking Salah Companion Development Database');
  console.log('====================================================');

  console.log(`📡 Environment Profile : ${config.nodeEnv}`);
  console.log(`🌐 Database Target     : ${config.databaseUrl ? 'PostgreSQL (Supabase)' : 'Local SQLite'}`);
  if (config.databaseUrl) {
    const masked = config.databaseUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`🔗 Connection URL      : ${masked}`);
  }

  console.log('\n[1/3] Testing Connection Health...');
  const health = await checkDbHealth();
  if (!health.connected) {
    console.error('❌ Database connection failed:', health.error);
    process.exit(1);
  }
  console.log(`✅ Connection Successful!`);
  console.log(`   - Server Time : ${health.serverTime}`);
  console.log(`   - Ping Latency: ${health.latencyMs}ms`);

  console.log('\n[2/3] Checking Table Statistics...');
  try {
    const [userCount, pendingCount, prayerLogCount, notifPrefCount] = await Promise.all([
      prisma.user.count(),
      prisma.pendingRegistration.count(),
      prisma.prayerLog.count(),
      prisma.notificationPreference.count(),
    ]);

    console.log(`   📊 Active Users              : ${userCount}`);
    console.log(`   ⏳ Pending Registrations     : ${pendingCount}`);
    console.log(`   🕌 Total Prayer Logs Logged  : ${prayerLogCount}`);
    console.log(`   🔔 Notification Preferences  : ${notifPrefCount}`);
  } catch (err) {
    console.warn('   ⚠️ Could not read some table counts:', err.message);
  }

  console.log('\n[3/3] Inspecting Recent Users (Last 5)...');
  try {
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        prayerCalculationMethod: true,
        createdAt: true,
      },
    });

    if (recentUsers.length === 0) {
      console.log('   (No registered users found in database yet)');
    } else {
      console.table(recentUsers);
    }
  } catch (err) {
    console.warn('   ⚠️ Error fetching recent users:', err.message);
  }

  console.log('\n====================================================');
  console.log('💡 TIP: Run `npx prisma studio` in the server folder');
  console.log('   to open a visual GUI database explorer in browser!');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Fatal error checking database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
