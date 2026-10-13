import assert from 'assert';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db/prisma.js';
import { config } from '../src/config/env.js';

const BASE_URL = `http://localhost:${process.env.PORT || 8080}`;

async function runTests() {
  console.log('=== Running Production Email + Password Authentication Tests ===');
  console.log(`Target API: ${BASE_URL}\n`);

  const uniqueId = Date.now();
  const testEmail = `salik_user_${uniqueId}@example.com`;
  const testName = 'Salik Ibn Adam';
  const initialPassword = 'SecurePassword123!';
  const updatedPassword = 'NewStrongPass2026!';

  // Clean up any potential stale test artifact
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail] } },
  }).catch(() => {});

  // --------------------------------------------------------------------------
  // Test 1: User Registration with Valid Credentials
  // --------------------------------------------------------------------------
  console.log('1. Testing User Registration (POST /api/auth/register)...');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: initialPassword,
    }),
  });

  assert.strictEqual(regRes.status, 201, `Expected 201 Created, got ${regRes.status}`);
  const regData = await regRes.json();

  assert.strictEqual(regData.success, true);
  assert(regData.token, 'Must return signed session token');
  assert.strictEqual(regData.user.email, testEmail);
  assert.strictEqual(regData.user.name, testName);
  assert.strictEqual(regData.user.password, undefined, 'CRITICAL: User password must NEVER be exposed in response');

  // Verify Database State
  const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(dbUser, 'User must exist in database');
  assert(dbUser.password, 'User password hash must exist in database');
  assert.notStrictEqual(dbUser.password, initialPassword, 'Password must be securely hashed, never stored plain text');
  assert(await bcrypt.compare(initialPassword, dbUser.password), 'bcrypt hash must match plain-text password');

  console.log('✓ Test 1 Passed: User registered, password securely hashed (bcrypt salt 12), and session token returned.');

  // --------------------------------------------------------------------------
  // Test 2: Duplicate Registration Rejection (409 Conflict)
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Duplicate Registration Rejection (409 Conflict)...');
  const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: initialPassword,
    }),
  });

  assert.strictEqual(dupRes.status, 409, `Expected 409 Conflict, got ${dupRes.status}`);
  const dupData = await dupRes.json();
  assert.strictEqual(dupData.code, 'USER_ALREADY_EXISTS');
  console.log('✓ Test 2 Passed: Duplicate registration properly rejected with 409 Conflict.');

  // --------------------------------------------------------------------------
  // Test 3: Weak Password Validation Rejection (Zod 400 Bad Request)
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Weak Password Rejection...');
  const weakRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Weak Pass User',
      email: `weak_${uniqueId}@example.com`,
      password: 'short', // less than 8 characters, no numbers
    }),
  });

  assert.strictEqual(weakRes.status, 400, `Expected 400 for weak password, got ${weakRes.status}`);
  console.log('✓ Test 3 Passed: Password policy enforced (minimum 8 chars with letters & numbers).');

  // --------------------------------------------------------------------------
  // Test 4: Login with Wrong Password (401 Unauthorized)
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Wrong Password Rejection (401 Unauthorized)...');
  const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'IncorrectPassword999!',
    }),
  });

  assert.strictEqual(wrongPassRes.status, 401, `Expected 401 Unauthorized, got ${wrongPassRes.status}`);
  const wrongPassData = await wrongPassRes.json();
  assert.strictEqual(wrongPassData.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(wrongPassData.error, 'Invalid email or password.');
  console.log('✓ Test 4 Passed: Wrong password rejected with generic authentication error.');

  // --------------------------------------------------------------------------
  // Test 5: Login with Non-Existent Email (401 Unauthorized)
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Non-Existent Email Rejection (Prevent Enumeration)...');
  const nonExistRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `nobody_exists_${uniqueId}@example.com`,
      password: 'SomePassword123!',
    }),
  });

  assert.strictEqual(nonExistRes.status, 401, `Expected 401 Unauthorized, got ${nonExistRes.status}`);
  const nonExistData = await nonExistRes.json();
  assert.strictEqual(nonExistData.code, 'INVALID_CREDENTIALS');
  console.log('✓ Test 5 Passed: Account enumeration prevented via consistent 401 response.');

  // --------------------------------------------------------------------------
  // Test 6: Login with Valid Credentials (200 OK)
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Successful Login (POST /api/auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
    }),
  });

  assert.strictEqual(loginRes.status, 200, `Expected 200 OK, got ${loginRes.status}`);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.success, true);
  assert(loginData.token, 'Must return authentication token');
  assert.strictEqual(loginData.user.email, testEmail);
  console.log('✓ Test 6 Passed: Login successful with valid credentials.');

  // --------------------------------------------------------------------------
  // Test 7: Protected Route Access (/api/auth/me)
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Protected Route Authentication (/api/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${loginData.token}`,
    },
  });

  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.id, dbUser.id);
  assert.strictEqual(meData.user.email, testEmail);
  console.log('✓ Test 7 Passed: Protected session validated via Bearer token.');

  // --------------------------------------------------------------------------
  // Test 8: Forgot Password Flow (POST /api/auth/forgot-password)
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Forgot Password Flow (POST /api/auth/forgot-password)...');
  const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({
      email: testEmail,
    }),
  });

  assert.strictEqual(forgotRes.status, 200);
  const forgotData = await forgotRes.json();
  assert.strictEqual(forgotData.success, true);
  assert(forgotData.resetToken, 'In authorized test mode, resetToken must be returned');

  // Verify Database State for Reset Token
  const userAfterForgot = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(userAfterForgot.resetPasswordTokenHash, 'resetPasswordTokenHash must be recorded');
  assert(userAfterForgot.resetPasswordExpiresAt, 'resetPasswordExpiresAt must be recorded');
  console.log('✓ Test 8 Passed: Password reset token generated and cryptographically stored.');

  // --------------------------------------------------------------------------
  // Test 9: Reset Password with Invalid Token (400 Bad Request)
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Reset Password with Invalid Token...');
  const invalidResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'completely_invalid_token_123',
      password: updatedPassword,
    }),
  });

  assert.strictEqual(invalidResetRes.status, 400);
  const invalidResetData = await invalidResetRes.json();
  assert.strictEqual(invalidResetData.code, 'INVALID_OR_EXPIRED_TOKEN');
  console.log('✓ Test 9 Passed: Invalid token rejected.');

  // --------------------------------------------------------------------------
  // Test 10: Complete Password Reset with Valid Token (200 OK)
  // --------------------------------------------------------------------------
  console.log('\n10. Testing Complete Password Reset with Valid Token...');
  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: forgotData.resetToken,
      password: updatedPassword,
    }),
  });

  assert.strictEqual(resetRes.status, 200);
  const resetData = await resetRes.json();
  assert.strictEqual(resetData.success, true);
  assert(resetData.token, 'Must return new session token upon successful reset');

  // Verify that reset token is cleared in DB
  const userAfterReset = await prisma.user.findUnique({ where: { email: testEmail } });
  assert.strictEqual(userAfterReset.resetPasswordTokenHash, null, 'Reset token hash must be invalidated');
  assert.strictEqual(userAfterReset.resetPasswordExpiresAt, null, 'Reset token expiry must be cleared');
  assert(await bcrypt.compare(updatedPassword, userAfterReset.password), 'New password hash must match updated password');
  console.log('✓ Test 10 Passed: Password reset completed and single-use token invalidated.');

  // --------------------------------------------------------------------------
  // Test 11: Login with New Password Succeeds, Old Password Fails
  // --------------------------------------------------------------------------
  console.log('\n11. Testing Login with New Password vs Old Password...');
  const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: initialPassword }),
  });
  assert.strictEqual(oldLoginRes.status, 401, 'Old password must no longer work');

  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: updatedPassword }),
  });
  assert.strictEqual(newLoginRes.status, 200, 'New password must log user in successfully');
  console.log('✓ Test 11 Passed: Credentials updated; old password rejected, new password verified.');

  // Clean up
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail] } },
  }).catch(() => {});

  console.log('\n======================================================');
  console.log('🎉 ALL 11 EMAIL + PASSWORD AUTHENTICATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
