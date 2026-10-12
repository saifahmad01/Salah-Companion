import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db/prisma.js';
import { config } from '../src/config/env.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;

console.log('--- Running Password Reset & Setup Integration Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  const timestamp = Date.now();
  const testEmail = `pwd_reset_${timestamp}@example.com`;
  const initialPassword = 'OldPassword123!';
  const newPassword = 'NewSecretPassword456!';
  const oauthEmail = `oauth_user_${timestamp}@example.com`;

  // Create active verified user with initial password with retry
  const salt = await bcrypt.hash(initialPassword, 12);
  let createdUser = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      createdUser = await prisma.user.create({
        data: {
          name: 'Password Test User',
          email: testEmail,
          password: salt,
          isEmailVerified: true,
          prayerCalculationMethod: 'Karachi',
        },
      });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Create active OAuth user with null password
  let oauthUser = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      oauthUser = await prisma.user.create({
        data: {
          name: 'OAuth No Password User',
          email: oauthEmail,
          password: null,
          googleId: `google_${timestamp}`,
          isEmailVerified: true,
          prayerCalculationMethod: 'Karachi',
        },
      });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`✓ Seeded test user: ${testEmail} and OAuth user: ${oauthEmail}`);

  // --------------------------------------------------------------------------
  // Test 1: Anti-Enumeration for non-existent email
  // --------------------------------------------------------------------------
  console.log('\n1. Testing Anti-Enumeration on Forgot Password (non-existent email)...');
  const fakeRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `nonexistent_${timestamp}@example.com` }),
  });
  assert.equal(fakeRes.status, 200, 'Non-existent email must still return 200 OK');
  const fakeData = await fakeRes.json();
  assert.equal(fakeData.success, true);
  console.log('✓ Test 1 Passed: Anti-enumeration confirmed.');

  // --------------------------------------------------------------------------
  // Test 2: Forgot Password Request for Existing User
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Forgot Password Request for existing user...');
  const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  assert.equal(forgotRes.status, 200, `Expected 200 OK, got ${forgotRes.status}`);
  const forgotData = await forgotRes.json();
  assert.equal(forgotData.success, true);

  // Check DB directly: reset_password_token_hash and reset_password_expires_at must exist
  const dbUserAfterForgot = await prisma.user.findUnique({ where: { id: createdUser.id } });
  assert(dbUserAfterForgot.resetPasswordTokenHash, 'Database must store reset password token hash');
  assert(dbUserAfterForgot.resetPasswordExpiresAt, 'Database must store expiration timestamp');
  console.log('✓ Test 2 Passed: Token hash and expiration stored in database.');

  // Extract raw token from previewUrl or URL generated
  let rawToken = null;
  if (forgotData.previewUrl) {
    const match = forgotData.previewUrl.match(/token=([a-f0-9]+)/);
    if (match) rawToken = match[1];
  }

  // If previewUrl wasn't in response, let's verify via DB hash matching or direct reset
  if (!rawToken) {
    // Generate a known rawToken and inject hash into DB
    rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.user.update({
      where: { id: createdUser.id },
      data: {
        resetPasswordTokenHash: hash,
        resetPasswordExpiresAt: new Date(Date.now() + 3600000),
      },
    });
  }

  // --------------------------------------------------------------------------
  // Test 3: Rate Limiting Cooldown on Forgot Password
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Rate Limiting on Forgot Password...');
  const rapidForgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  assert.equal(rapidForgotRes.status, 429, 'Immediate second forgot password request must be rate limited with 429');
  console.log('✓ Test 3 Passed: 60-second cooldown rate limiting enforced.');

  // --------------------------------------------------------------------------
  // Test 4: Reset Password with Invalid Token
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Reset Password with Invalid Token...');
  const invalidResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'invalid_deadbeef_token_1234567890',
      password: newPassword,
    }),
  });
  assert.equal(invalidResetRes.status, 400, 'Invalid reset token must return 400');
  const invalidResetData = await invalidResetRes.json();
  assert.equal(invalidResetData.code, 'INVALID_RESET_TOKEN');
  console.log('✓ Test 4 Passed: Invalid reset token correctly rejected.');

  // --------------------------------------------------------------------------
  // Test 5: Reset Password with Valid Token
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Reset Password with Valid Token...');
  const validResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: newPassword,
    }),
  });
  assert.equal(validResetRes.status, 200, `Expected 200 OK, got ${validResetRes.status}`);
  const validResetData = await validResetRes.json();
  assert.equal(validResetData.success, true);
  assert(validResetData.token, 'Must return JWT auth token upon successful reset');
  assert(validResetData.user, 'Must return user profile upon successful reset');

  // Verify single-use token invalidation in DB
  const dbUserAfterReset = await prisma.user.findUnique({ where: { id: createdUser.id } });
  assert.equal(dbUserAfterReset.resetPasswordTokenHash, null, 'Reset token hash must be cleared (single-use)');
  assert.equal(dbUserAfterReset.resetPasswordExpiresAt, null, 'Reset token expiry must be cleared');
  console.log('✓ Test 5 Passed: Password successfully reset and token consumed.');

  // --------------------------------------------------------------------------
  // Test 6: Login with New Password
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Login with New Password...');
  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: newPassword,
    }),
  });
  assert.equal(newLoginRes.status, 200, 'Login with new password must succeed');
  const newLoginData = await newLoginRes.json();
  const authToken = newLoginData.token;
  assert(authToken, 'Must receive auth token on login');
  console.log('✓ Test 6 Passed: Login with new password succeeded.');

  // --------------------------------------------------------------------------
  // Test 7: Set/Change Password for Authenticated User (requires old password)
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Set/Change Password for Authenticated User...');
  // Bad current password
  const badOldPassRes = await fetch(`${BASE_URL}/api/auth/set-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      password: 'ThirdPassword789!',
      currentPassword: 'WrongOldPassword!',
    }),
  });
  assert.equal(badOldPassRes.status, 401, 'Wrong current password must return 401');

  // Correct current password
  const changePassRes = await fetch(`${BASE_URL}/api/auth/set-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      password: 'ThirdPassword789!',
      currentPassword: newPassword,
    }),
  });
  assert.equal(changePassRes.status, 200, 'Correct current password must allow change');
  console.log('✓ Test 7 Passed: Changing existing password verified current password.');

  // --------------------------------------------------------------------------
  // Test 8: Set Password for OAuth User (password is null)
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Set Password for OAuth User (without previous password)...');
  // Generate JWT for oauth user
  const jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret_for_dev_only_change_in_production';
  const jwt = await import('jsonwebtoken');
  const oauthToken = jwt.default.sign(
    { id: oauthUser.id, email: oauthUser.email, role: oauthUser.role },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const oauthSetPassRes = await fetch(`${BASE_URL}/api/auth/set-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${oauthToken}`,
    },
    body: JSON.stringify({
      password: 'OAuthNewPassword123!',
    }),
  });
  assert.equal(oauthSetPassRes.status, 200, 'OAuth user must be able to set password without currentPassword');

  // Verify OAuth user can now log in via email & password!
  const oauthLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: oauthEmail,
      password: 'OAuthNewPassword123!',
    }),
  });
  assert.equal(oauthLoginRes.status, 200, 'OAuth user can now log in with their newly set password');
  console.log('✓ Test 8 Passed: OAuth user successfully set password and logged in via credentials.');

  // Cleanup
  try {
    await prisma.user.deleteMany({
      where: { id: { in: [createdUser.id, oauthUser.id] } },
    });
    await prisma.$disconnect();
  } catch {}

  console.log('\n🎉 ALL 8 PASSWORD RESET & SETUP TESTS PASSED! 🎉\n');
}

runTests().catch(async (err) => {
  console.error('\n❌ Password reset test failed:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
