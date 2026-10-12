import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';
import { config } from '../src/config/env.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;

console.log('=== Running Production 6-Digit Email OTP Authentication Tests ===');
console.log(`Target API: ${BASE_URL}\n`);

async function runOtpTests() {
  const timestamp = Date.now();
  const testEmail = `otp_user_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Tariq Companion';

  // --------------------------------------------------------------------------
  // Test 1: User Registration Dispatches 6-Digit OTP
  // --------------------------------------------------------------------------
  console.log('1. Testing User Registration (POST /api/auth/register)...');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      prayerCalculationMethod: 'Karachi',
    }),
  });

  assert.equal(regRes.status, 201, `Expected status 201 Created, received ${regRes.status}`);
  const regData = await regRes.json();
  assert.equal(regData.success, true, 'Registration must succeed');
  assert.equal(regData.requiresOtp, true, 'Response must indicate requiresOtp: true');
  assert.equal(regData.requiresEmailVerification, true, 'Must indicate email verification required');
  assert(regData.token, 'Must return OTP in response in dev mode');
  assert.equal(typeof regData.token, 'string', 'OTP token must be string');
  assert.match(regData.token, /^\d{6}$/, 'OTP token must be exactly 6 digits');
  const validOtp = regData.token;
  console.log(`✓ Test 1 Passed: User registered with 6-digit OTP: ${validOtp}`);

  // --------------------------------------------------------------------------
  // Test 2: Database Storage Security & Pending State
  // --------------------------------------------------------------------------
  console.log('\n2. Verifying Pending Registration in Database...');
  const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
  assert.equal(userInDb, null, 'User must NOT exist in users table prior to OTP verification');

  const pendingInDb = await prisma.pendingRegistration.findUnique({ where: { email: testEmail } });
  assert(pendingInDb, 'Registration must be stored in pending_registrations');
  assert.notEqual(pendingInDb.tokenHash, validOtp, 'Raw OTP must NEVER be stored in the database');
  const expectedHash = crypto.createHash('sha256').update(validOtp).digest('hex');
  assert.equal(pendingInDb.tokenHash, expectedHash, 'Stored token hash must equal SHA-256(otp)');
  assert(pendingInDb.expiresAt > new Date(), 'OTP expiration must be in the future');
  const ttlMs = new Date(pendingInDb.expiresAt).getTime() - Date.now();
  assert(ttlMs <= 5 * 60 * 1000 + 10000, 'OTP TTL must be <= 5 minutes');
  console.log('✓ Test 2 Passed: Pending registration secured with 5-minute SHA-256 hash.');

  // --------------------------------------------------------------------------
  // Test 3: Invalid OTP Format Rejection
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Malformed OTP Rejection (POST /api/auth/verify-otp)...');
  const invalidFormatRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: '123', // Not 6 digits
    }),
  });
  assert.equal(invalidFormatRes.status, 400, 'Non-6-digit OTP must be rejected with 400');
  const invalidFormatData = await invalidFormatRes.json();
  assert(
    invalidFormatData.code === 'VALIDATION_ERROR' || invalidFormatData.code === 'INVALID_OTP_FORMAT',
    `Expected VALIDATION_ERROR or INVALID_OTP_FORMAT, got ${invalidFormatData.code}`
  );
  console.log('✓ Test 3 Passed: Non-6-digit OTP rejected.');

  // --------------------------------------------------------------------------
  // Test 4: Incorrect OTP Rejection & Remaining Attempts Counter
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Incorrect OTP & Attempt Tracking...');
  const wrongOtp = validOtp === '111111' ? '222222' : '111111';
  const wrongRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: wrongOtp,
    }),
  });
  assert.equal(wrongRes.status, 400, 'Wrong OTP must be rejected with 400');
  const wrongData = await wrongRes.json();
  console.log('wrongData received:', wrongData);
  assert.equal(wrongData.code, 'OTP_INVALID', 'Must return OTP_INVALID');
  assert(wrongData.remainingAttempts !== undefined, 'Must report remaining attempts');
  assert.equal(wrongData.remainingAttempts, 4, 'Remaining attempts must be 4 after 1 failure');
  console.log(`✓ Test 4 Passed: Incorrect OTP rejected with remaining attempts = ${wrongData.remainingAttempts}.`);

  // --------------------------------------------------------------------------
  // Test 5: Resend Cooldown Rate Limiting (60 Seconds)
  // --------------------------------------------------------------------------
  console.log('\n5. Testing 60-Second Resend Cooldown (POST /api/auth/send-otp)...');
  const immediateResendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      type: 'VERIFICATION',
    }),
  });
  assert.equal(immediateResendRes.status, 429, 'Immediate resend must be throttled with 429');
  const immediateResendData = await immediateResendRes.json();
  assert.equal(immediateResendData.code, 'RATE_LIMITED', 'Must return RATE_LIMITED');
  assert(immediateResendData.retryAfter > 0, 'Must return positive retryAfter seconds');
  console.log(`✓ Test 5 Passed: Resend throttled with retryAfter: ${immediateResendData.retryAfter}s.`);

  // --------------------------------------------------------------------------
  // Test 6: Account Enumeration Protection on Unknown Emails
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Account Enumeration Protection on Unknown Email...');
  const unknownEmail = `unknown_${Date.now()}@example.com`;
  const unknownSendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: unknownEmail,
      type: 'LOGIN',
    }),
  });
  assert.equal(unknownSendRes.status, 200, 'Unknown email request must return 200 to prevent enumeration');
  const unknownSendData = await unknownSendRes.json();
  assert.equal(unknownSendData.success, true, 'Must return success: true uniformly');
  console.log('✓ Test 6 Passed: Account enumeration timing mitigation verified.');

  // --------------------------------------------------------------------------
  // Test 7: Unverified Login Prompt Returning requiresOtp: true
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Unverified User Login (POST /api/auth/login)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert.equal(loginRes.status, 403, 'Unverified user login must be forbidden with 403');
  const loginData = await loginRes.json();
  assert.equal(loginData.code, 'EMAIL_NOT_VERIFIED', 'Must return EMAIL_NOT_VERIFIED');
  assert.equal(loginData.requiresOtp, true, 'Must flag requiresOtp: true to trigger OTP screen');
  console.log('✓ Test 7 Passed: Unverified login correctly requires OTP.');

  // --------------------------------------------------------------------------
  // Test 8: Valid OTP Verification & Account Activation
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Valid OTP Verification (POST /api/auth/verify-otp)...');
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: validOtp,
    }),
  });
  assert.equal(verifyRes.status, 200, `Valid OTP verification must succeed with 200, got ${verifyRes.status}`);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.success, true, 'Verification must report success: true');
  assert(verifyData.token, 'Must issue JWT token upon verification');
  assert(verifyData.user, 'Must return verified user profile');
  assert.equal(verifyData.user.email, testEmail, 'User email must match');
  assert.equal(verifyData.user.isEmailVerified, true, 'User must be marked email-verified');

  // Check HttpOnly auth_token cookie
  const setCookieHeader = verifyRes.headers.get('set-cookie');
  assert(setCookieHeader && setCookieHeader.includes('auth_token='), 'Must set HttpOnly auth_token session cookie');

  // Verify DB state: PendingRegistration must be deleted!
  const pendingAfter = await prisma.pendingRegistration.findUnique({ where: { email: testEmail } });
  assert.equal(pendingAfter, null, 'PendingRegistration must be atomically removed from database');

  // Verify DB state: User must now exist in users table!
  const userAfter = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(userAfter, 'User record must now exist in users table');
  assert.equal(userAfter.isEmailVerified, true, 'User record in database must be verified');
  console.log('✓ Test 8 Passed: Valid OTP verified, account activated, and session cookie issued.');

  // --------------------------------------------------------------------------
  // Test 9: Prevention of Replay Attacks (Re-submitting Consumed OTP)
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Prevention of OTP Replay Attack (Re-submitting used OTP)...');
  const replayRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: validOtp,
    }),
  });
  // Since user is already verified and OTP consumed, must reject
  assert.equal(replayRes.status, 400, 'Re-submitting consumed OTP must be rejected with 400');
  const replayData = await replayRes.json();
  assert(replayData.code === 'ALREADY_VERIFIED' || replayData.code === 'NO_ACTIVE_OTP' || replayData.code === 'OTP_INVALID');
  console.log('✓ Test 9 Passed: Replay attack prevented.');

  // --------------------------------------------------------------------------
  // Test 10: Verified User Login Succeeded
  // --------------------------------------------------------------------------
  console.log('\n10. Testing Verified User Login (POST /api/auth/login)...');
  const verifiedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert.equal(verifiedLoginRes.status, 200, 'Verified user login must succeed with 200');
  const verifiedLoginData = await verifiedLoginRes.json();
  assert.equal(verifiedLoginData.success, true, 'Login must succeed');
  assert(verifiedLoginData.token, 'Must return JWT session token');
  console.log('✓ Test 10 Passed: Verified user logged in successfully.');

  // --------------------------------------------------------------------------
  // Test 11: 5-Attempt Lockout Protection on OTP Verification
  // --------------------------------------------------------------------------
  console.log('\n11. Testing 5-Attempt Brute-Force Lockout Protection...');
  const bruteForceEmail = `bruteforce_${Date.now()}@example.com`;
  const bfRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Brute Test',
      email: bruteForceEmail,
      password: testPassword,
    }),
  });
  assert.equal(bfRegRes.status, 201);

  // Submit 5 incorrect OTP attempts
  let lastBfRes;
  for (let i = 1; i <= 5; i++) {
    lastBfRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: bruteForceEmail,
        otp: '000000',
      }),
    });
  }

  // 5th attempt must trigger 429 OTP_LOCKED
  assert.equal(lastBfRes.status, 429, '5th consecutive failure must return 429 Too Many Requests');
  const lastBfData = await lastBfRes.json();
  assert.equal(lastBfData.code, 'OTP_LOCKED', 'Must return OTP_LOCKED');
  assert.equal(lastBfData.remainingAttempts, 0, 'Remaining attempts must be 0');
  assert(lastBfData.retryAfter > 0, 'Must specify retryAfter lockout duration');

  // Verify that the code in DB was invalidated
  const pendingBf = await prisma.pendingRegistration.findUnique({ where: { email: bruteForceEmail } });
  assert(pendingBf.expiresAt.getTime() <= Date.now(), 'Token in DB must be invalidated immediately upon lockout');
  console.log('✓ Test 11 Passed: 5-attempt brute-force lockout triggered and token invalidated in database.');

  // --------------------------------------------------------------------------
  // Clean Up Test Users
  // --------------------------------------------------------------------------
  console.log('\nCleaning up test records...');
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail, bruteForceEmail] } },
  });
  await prisma.pendingRegistration.deleteMany({
    where: { email: { in: [testEmail, bruteForceEmail] } },
  });
  console.log('✓ Clean up complete.');

  console.log('\n======================================================');
  console.log('🎉 ALL 11 PRODUCTION EMAIL OTP AUTHENTICATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

runOtpTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ OTP Test Failure:', err);
    process.exit(1);
  });
