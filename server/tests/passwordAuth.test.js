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
  await prisma.pendingRegistration.deleteMany({
    where: { email: { in: [testEmail] } },
  }).catch(() => {});

  // --------------------------------------------------------------------------
  // Test 1: User Registration Initiation (Requires Email OTP Verification)
  // --------------------------------------------------------------------------
  console.log('1. Testing Registration Initiation & Mandatory OTP Verification...');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: initialPassword,
    }),
  });

  assert.strictEqual(regRes.status, 200, `Expected 200 OK, got ${regRes.status}`);
  const regData = await regRes.json();

  assert.strictEqual(regData.success, true);
  assert.strictEqual(regData.requiresVerification, true, 'CRITICAL: Registration must require OTP email verification');
  assert.strictEqual(regData.token, undefined, 'CRITICAL: No session token issued before email OTP verification');
  assert(regData.testOtp, 'Test harness must provide testOtp for automated verification');

  // CRITICAL VERIFICATION: User MUST NOT be created in users table yet!
  const unverifiedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert.strictEqual(unverifiedUser, null, 'SECURITY CHECK: User record must NOT exist in users table prior to OTP verification');

  // Verify PendingRegistration table state
  const pendingReg = await prisma.pendingRegistration.findUnique({ where: { email: testEmail } });
  assert(pendingReg, 'Record must exist in pending_registrations table');
  assert(pendingReg.tokenHash, 'OTP hash must exist in pending_registrations');
  assert.notStrictEqual(pendingReg.password, initialPassword, 'Staged password must be bcrypt-hashed');
  assert(await bcrypt.compare(initialPassword, pendingReg.password), 'Staged password must match hash');

  console.log('✓ Test 1 Passed: Direct account creation prevented; 6-digit OTP dispatched and staged securely in pending_registrations.');

  // --------------------------------------------------------------------------
  // Test 2: Resend Cooldown Enforcement on Registration (60s)
  // --------------------------------------------------------------------------
  console.log('\n2. Testing 60-Second Resend Cooldown on Registration...');
  const rapidRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: initialPassword,
    }),
  });

  assert.strictEqual(rapidRegRes.status, 429, `Expected 429 for rapid resend, got ${rapidRegRes.status}`);
  const rapidData = await rapidRegRes.json();
  assert.strictEqual(rapidData.code, 'RESEND_COOLDOWN');
  console.log('✓ Test 2 Passed: 60-second cooldown strictly enforced on registration OTP dispatch.');

  // --------------------------------------------------------------------------
  // Test 3: Incorrect Registration OTP Rejection & Attempt Tracking
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Incorrect OTP Rejection on Registration (POST /api/auth/register-verify)...');
  const wrongOtpRes = await fetch(`${BASE_URL}/api/auth/register-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: '000000',
    }),
  });

  assert.strictEqual(wrongOtpRes.status, 400, `Expected 400 for wrong OTP, got ${wrongOtpRes.status}`);
  const wrongOtpData = await wrongOtpRes.json();
  assert.strictEqual(wrongOtpData.code, 'OTP_MISMATCH');
  assert.strictEqual(wrongOtpData.remainingAttempts, 4);

  // Still not created in users table
  const stillUncreated = await prisma.user.findUnique({ where: { email: testEmail } });
  assert.strictEqual(stillUncreated, null, 'User still not created after failed verification attempt');
  console.log('✓ Test 3 Passed: Invalid OTP rejected and attempts counter decremented.');

  // --------------------------------------------------------------------------
  // Test 4: Correct Registration OTP Completes Account Creation
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Successful Registration OTP Verification...');
  const verifyRes = await fetch(`${BASE_URL}/api/auth/register-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: regData.testOtp,
    }),
  });

  assert.strictEqual(verifyRes.status, 201, `Expected 201 Created upon OTP verification, got ${verifyRes.status}`);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.success, true);
  assert(verifyData.token, 'Must return active session token upon successful verification');
  assert.strictEqual(verifyData.user.email, testEmail);
  assert.strictEqual(verifyData.user.name, testName);
  assert.strictEqual(verifyData.user.isEmailVerified, true, 'User must be marked verified');

  // Verify database: User now exists in users table
  const activatedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(activatedUser, 'User must now exist in users table');
  assert.strictEqual(activatedUser.isEmailVerified, true);
  assert(await bcrypt.compare(initialPassword, activatedUser.password), 'Password hash in users table must match');

  // Verify database: PendingRegistration record cleaned up
  const cleanedPending = await prisma.pendingRegistration.findUnique({ where: { email: testEmail } });
  assert.strictEqual(cleanedPending, null, 'pending_registrations entry must be deleted after successful activation');
  console.log('✓ Test 4 Passed: 6-digit OTP verified, user activated in database with isEmailVerified: true, and session token issued.');

  // --------------------------------------------------------------------------
  // Test 5: Duplicate Registration Rejection for Verified User (409 Conflict)
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Duplicate Registration Rejection for Existing User...');
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
  console.log('✓ Test 5 Passed: Existing user registration rejected with 409 Conflict.');

  // --------------------------------------------------------------------------
  // Test 6: Weak Password Validation Rejection (Zod 400 Bad Request)
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Weak Password Rejection...');
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
  console.log('✓ Test 6 Passed: Password policy enforced (minimum 8 chars with letters & numbers).');

  // --------------------------------------------------------------------------
  // Test 7: Login with Wrong Password (401 Unauthorized)
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Wrong Password Rejection (401 Unauthorized)...');
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
  console.log('✓ Test 7 Passed: Wrong password rejected with generic authentication error.');

  // --------------------------------------------------------------------------
  // Test 8: Login with Verified Email & Password (200 OK)
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Successful Login (POST /api/auth/login)...');
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
  console.log('✓ Test 8 Passed: Login successful with verified email and password.');

  // --------------------------------------------------------------------------
  // Test 9: Protected Route Access (/api/auth/me)
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Protected Route Authentication (/api/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${loginData.token}`,
    },
  });

  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.id, activatedUser.id);
  assert.strictEqual(meData.user.email, testEmail);
  console.log('✓ Test 9 Passed: Protected session validated via Bearer token.');

  // --------------------------------------------------------------------------
  // Test 10: Forgot Password Flow (POST /api/auth/forgot-password)
  // --------------------------------------------------------------------------
  console.log('\n10. Testing Forgot Password Flow (POST /api/auth/forgot-password)...');
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

  // --------------------------------------------------------------------------
  // Test 11: Complete Password Reset with Valid Token (200 OK)
  // --------------------------------------------------------------------------
  console.log('\n11. Testing Complete Password Reset with Valid Token...');
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

  // Verify that new password works and old password fails
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
  console.log('✓ Test 11 Passed: Password reset flow completed and verified.');

  // Clean up
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail] } },
  }).catch(() => {});
  await prisma.pendingRegistration.deleteMany({
    where: { email: { in: [testEmail] } },
  }).catch(() => {});

  console.log('\n======================================================');
  console.log('🎉 ALL 11 EMAIL + PASSWORD & OTP VERIFICATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
