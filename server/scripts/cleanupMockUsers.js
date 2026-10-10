import { query } from '../src/db/connection.js';

async function run() {
  await query(`DELETE FROM prayer_logs WHERE user_id LIKE 'test_user_%'`);
  const deleteRes = await query(`
    DELETE FROM users 
    WHERE email IN ('user.google@gmail.com', 'direct@gmail.com') 
       OR id LIKE 'test_user_%' 
       OR email IS NULL
  `);
  console.log(`Cleaned mock/test users: ${deleteRes.rowCount} rows affected.`);

  const listRes = await query('SELECT id, email, name, google_id FROM users');
  console.log('Active verified users in database:');
  console.table(listRes.rows);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
