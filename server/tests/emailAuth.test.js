import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';
import { config } from '../src/config/env.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;

console.log('--- Running Production Email & Password Authentication Integration Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Salah Devotee';

  // --------------------------------------------------------------------------
  // Test 1: User Registration Dispatches 6-Digit OTP
  // --------------------------------------------------------------------------
  console.log('1. Testing User Registration (POST /api/auth/register)...');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      prayerCalculationMethod: 'Karachi',
    }),
  });

  assert.equal(regRes.status, 201, `Expected status 201 Created, received ${regRes.status}`);
  const regData = await regRes.json();
  assert.equal(regData.success, true, 'Registration must be successful');
  assert.equal(regData.requiresEmailVerification, true, 'Must require email verification');
  assert.equal(regData.requiresOtp, true, 'Must require 6-digit OTP verification');
  assert(regData.token, 'Must return OTP in test mode with valid test secret');
  assert.match(regData.token, /^\d{6}$/, 'OTP must be exactly 6 digits');
  const rawOtp = regData.token;
  console.log(`✓ Test 1 Passed: User registered, 6-digit OTP dispatched: ${rawOtp}`);

  // --------------------------------------------------------------------------
  // Test 2: Database Security Inspection - Ensure Account Created ONLY After Verification
  // --------------------------------------------------------------------------
  console.log('\n2. Verifying Pending Registration Storage (Checking Database directly)...');
  // Must NOT exist in `users` table yet!
  const dbUserBefore = await prisma.user.findUnique({ where: { email: testEmail } });
  assert.equal(dbUserBefore, null, 'User record must NOT exist in users table prior to email verification!');

  // Must exist in `pending_registrations` table!
  const dbPending = await prisma.pendingRegistration.findUnique({ where: { email: testEmail } });
  assert(dbPending, 'Pending registration record must exist in pending_registrations table');

  // Verify that rawOtp is NEVER stored raw in the database!
  assert.notEqual(dbPending.tokenHash, rawOtp, 'Raw OTP must NEVER be stored in the database!');

  // Verify that stored hash matches SHA-256 of the raw token
  const expectedHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  assert.equal(dbPending.tokenHash, expectedHash, 'Stored token hash must equal SHA-256(rawOtp)');
  assert(dbPending.password.startsWith('$2a$') || dbPending.password.startsWith('$2b$'), 'Password must be bcrypt hashed');
  console.log(`✓ Test 2 Passed: User not in users table yet. Stored in pending_registrations with SHA-256 hash: ${expectedHash.substring(0, 16)}...`);

  // --------------------------------------------------------------------------
  // Test 3: Unverified Login Blocked
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Unverified User Login Blocking (POST /api/auth/login)...');
  const unverifiedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  assert.equal(unverifiedLoginRes.status, 403, `Expected status 403 Forbidden for unverified user, got ${unverifiedLoginRes.status}`);
  const unverifiedLoginData = await unverifiedLoginRes.json();
  assert.equal(unverifiedLoginData.code, 'EMAIL_NOT_VERIFIED', 'Error code must be EMAIL_NOT_VERIFIED');
  assert.equal(unverifiedLoginData.requiresOtp, true, 'Must indicate OTP is required');
  console.log('✓ Test 3 Passed: Login for unverified account successfully blocked with 403.');

  // --------------------------------------------------------------------------
  // Test 4: Actionable Error Feedback (Wrong Password vs Account Not Found)
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Actionable Error Feedback (Wrong Password vs Account Not Found)...');
  const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword999',
    }),
  });
  assert.equal(badPassRes.status, 401, 'Wrong password must return 401');
  const badPassData = await badPassRes.json();
  assert.equal(badPassData.code, 'INVALID_PASSWORD', 'Code must be INVALID_PASSWORD');
  assert(badPassData.error.toLowerCase().includes('incorrect password'), 'Must specify incorrect password');

  const unknownUserRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `nonexistent_${timestamp}@example.com`,
      password: testPassword,
    }),
  });
  assert.equal(unknownUserRes.status, 404, 'Nonexistent email must return 404 Not Found');
  const unknownUserData = await unknownUserRes.json();
  assert.equal(unknownUserData.code, 'ACCOUNT_NOT_FOUND', 'Code must be ACCOUNT_NOT_FOUND');
  assert(unknownUserData.error.toLowerCase().includes('no account found'), 'Must clearly tell user account does not exist');
  console.log('✓ Test 4 Passed: Actionable error messages returned for wrong password (401) and account not found (404).');

  // --------------------------------------------------------------------------
  // Test 5: Legacy Link Retirement: POST /api/auth/verify-email returns 410 Gone
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Legacy Verification Link Retirement (POST /api/auth/verify-email returns 410 Gone)...');
  const legacyPostRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'obsolete_magic_link_token',
    }),
  });
  assert.equal(legacyPostRes.status, 410, 'Obsolete magic link endpoint must return 410 Gone');
  const legacyPostData = await legacyPostRes.json();
  assert.equal(legacyPostData.code, 'OBSOLETE_VERIFICATION_LINK', 'Code must be OBSOLETE_VERIFICATION_LINK');
  console.log('✓ Test 5 Passed: Legacy magic link verification endpoint safely retired with 410 Gone.');

  // --------------------------------------------------------------------------
  // Test 6: Legacy Link Retirement: GET /api/auth/verify-email redirects to OTP login
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Legacy Verification Link Click (GET /api/auth/verify-email redirects to login)...');
  const legacyGetRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=obsolete_link`, {
    method: 'GET',
    redirect: 'manual',
  });
  assert.equal(legacyGetRes.status, 302, 'Legacy verification link GET request must return 302 Redirect');
  const locationHeader = legacyGetRes.headers.get('location');
  assert(locationHeader && locationHeader.includes('/login?notice=use_otp'), 'Must redirect to OTP login screen');
  console.log('✓ Test 6 Passed: Legacy verification link click cleanly redirects to OTP login.');

  // --------------------------------------------------------------------------
  // Test 7: Successful Email Verification via Valid 6-Digit OTP
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Valid 6-Digit OTP Verification (POST /api/auth/verify-otp)...');
  const validVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: rawOtp,
    }),
  });

  assert.equal(validVerifyRes.status, 200, `Expected 200 OK for valid OTP, got ${validVerifyRes.status}`);
  const validVerifyData = await validVerifyRes.json();
  assert.equal(validVerifyData.success, true, 'Verification must succeed');
  assert.equal(validVerifyData.user.isEmailVerified, true, 'User must now be verified');

  // Verify in database: pending_registrations record is deleted (single-use guarantee)
  const dbPendingAfter = await prisma.pendingRegistration.findUnique({ where: { email: testEmail } });
  assert.equal(dbPendingAfter, null, 'Pending registration must be deleted after verification');

  // users table now contains the verified active account!
  const dbUserVerified = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(dbUserVerified, 'User record must now exist in users table');
  assert.equal(dbUserVerified.isEmailVerified, true, 'isEmailVerified must be true in users table');
  console.log('✓ Test 7 Passed: Pending registration converted to active verified User, and pending record removed.');

  // --------------------------------------------------------------------------
  // Test 8: Single-Use OTP Reuse Prevention
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Token Reuse Prevention (Re-submitting already used OTP)...');
  const reusedVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: rawOtp,
    }),
  });
  assert.equal(reusedVerifyRes.status, 400, 'Reusing an OTP must be rejected with 400');
  console.log('✓ Test 8 Passed: Replay/reuse of consumed OTP blocked.');

  // --------------------------------------------------------------------------
  // Test 9: Verified User Login
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Login for Verified User (POST /api/auth/login)...');
  const verifiedLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  assert.equal(verifiedLoginRes.status, 200, `Expected 200 OK for verified user login, got ${verifiedLoginRes.status}`);
  const verifiedLoginData = await verifiedLoginRes.json();
  assert.equal(verifiedLoginData.success, true);
  assert(verifiedLoginData.token, 'Must return JWT token');
  assert.equal(verifiedLoginData.user.email, testEmail);
  assert.equal(verifiedLoginData.user.isEmailVerified, true);
  const loginCookie = verifiedLoginRes.headers.get('set-cookie');
  assert(loginCookie && loginCookie.includes('auth_token='), 'Must set HttpOnly auth_token session cookie');
  console.log('✓ Test 9 Passed: Verified user logged in successfully with HttpOnly cookie.');

  // --------------------------------------------------------------------------
  // Test 10: Resend Verification Email with Rate Limiting Cooldown
  // --------------------------------------------------------------------------
  console.log('\n10. Testing Resend Verification Email Rate Limiting...');
  // Create an unverified user to test resend
  const resendTestEmail = `resend_${timestamp}@example.com`;
  const reg2Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({
      name: 'Resend Tester',
      email: resendTestEmail,
      password: testPassword,
    }),
  });
  assert.equal(reg2Res.status, 201);

  // Attempting resend immediately should be rate-limited
  const immediateResendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: resendTestEmail }),
  });

  assert.equal(immediateResendRes.status, 429, `Expected 429 Too Many Requests, got ${immediateResendRes.status}`);
  const immediateResendData = await immediateResendRes.json();
  assert.equal(immediateResendData.code, 'RATE_LIMITED', 'Error code must be RATE_LIMITED');
  assert(immediateResendData.retryAfter > 0, 'Must include retryAfter seconds');
  console.log(`✓ Test 10 Passed: Immediate resend correctly throttled with 429 (retry after ${immediateResendData.retryAfter}s).`);

  // --------------------------------------------------------------------------
  // Test 11: Clear Actionable Feedback on Duplicate Registration
  // --------------------------------------------------------------------------
  console.log('\n11. Testing Clear Actionable Feedback on Duplicate Registration...');
  // Register with already-verified email clearly informs user to log in
  const duplicateRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail, // Already verified user
      password: testPassword,
    }),
  });
  assert.equal(duplicateRegisterRes.status, 409, 'Registering existing verified user must return 409 Conflict');
  const duplicateRegisterData = await duplicateRegisterRes.json();
  assert.equal(duplicateRegisterData.code, 'EMAIL_ALREADY_EXISTS', 'Code must be EMAIL_ALREADY_EXISTS');
  assert(duplicateRegisterData.error.toLowerCase().includes('already exists'), 'Must clearly tell user account already exists');
  console.log('✓ Test 11 Passed: Clear actionable error message for duplicate register (409).');

  // --------------------------------------------------------------------------
  // Test 12: Diagnostic Email Health Check
  // --------------------------------------------------------------------------
  console.log('\n12. Testing Diagnostic Email Health Endpoint (GET /api/auth/email-health)...');
  const healthRes = await fetch(`${BASE_URL}/api/auth/email-health`);
  assert(healthRes.status === 200 || healthRes.status === 503, `Expected 200 or 503, got ${healthRes.status}`);
  const healthData = await healthRes.json();
  assert(typeof healthData.connected === 'boolean', 'Must report boolean connected status');
  console.log(`✓ Test 12 Passed: Email health responded with connected: ${healthData.connected}`);

  // --------------------------------------------------------------------------
  // Test 13: Direct Browser Email Click -> Redirect to OTP Login Screen
  // --------------------------------------------------------------------------
  console.log('\n13. Testing Browser Verification Link Click Redirect...');
  const browserClickRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=old_token_example`, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'manual',
  });
  assert.equal(browserClickRes.status, 302, 'Browser click on legacy verify link must redirect 302');
  const loc = browserClickRes.headers.get('location');
  assert(loc && loc.includes('notice=use_otp'), 'Must redirect with notice=use_otp');
  console.log('✓ Test 13 Passed: Browser link safely redirected to OTP login.');

  // --------------------------------------------------------------------------
  // Test 14: Guard Protected Features - Block Unverified User Access
  // --------------------------------------------------------------------------
  console.log('\n14. Testing Guard on Protected Features for Unverified User...');
  const unverifiedEmail = `unverified_access_${timestamp}@example.com`;
  const unverifiedUser = await prisma.user.create({
    data: {
      name: 'Unverified Access Tester',
      email: unverifiedEmail,
      password: '$2a$12$dummyhashforunverifiedtestingonly',
      isEmailVerified: false,
    },
  });

  const unverifiedToken = jwt.sign(
    { id: unverifiedUser.id, email: unverifiedUser.email, role: 'USER' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  const blockedRes = await fetch(`${BASE_URL}/api/prayers/today`, {
    headers: { 'Authorization': `Bearer ${unverifiedToken}` },
  });
  assert.equal(blockedRes.status, 403, 'Unverified user must receive 403 Forbidden on protected prayer routes');
  const blockedData = await blockedRes.json();
  assert.equal(blockedData.code, 'EMAIL_NOT_VERIFIED', 'Error code must be EMAIL_NOT_VERIFIED');
  console.log('✓ Test 14 Passed: Protected routes strictly reject unverified users with 403 EMAIL_NOT_VERIFIED.');

  // --------------------------------------------------------------------------
  // Test 15: Google OAuth Email Verification Claim Auto-Verification
  // --------------------------------------------------------------------------
  console.log('\n15. Testing Google OAuth Email Verification Claim Auto-Verification...');
  const googleRes = await fetch(`${BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({
      credential: 'mock_direct_google_test',
      prayerCalculationMethod: 'Karachi',
      testSecret: config.jwtSecret,
    }),
  });

  assert.equal(googleRes.status, 200, `Google OAuth with verified email must succeed (got ${googleRes.status})`);
  const googleData = await googleRes.json();
  assert.equal(googleData.user.isEmailVerified, true, 'User must be marked email-verified via trusted Google claim');
  console.log('✓ Test 15 Passed: Google OAuth auto-verified claim succeeded.');

  // --------------------------------------------------------------------------
  // Test 16: Concurrency Safety & Race Condition Replay Prevention
  // --------------------------------------------------------------------------
  console.log('\n16. Testing Concurrency Safety & Simultaneous OTP Verification Race Conditions...');
  const concurrentEmail = `concurrent_${timestamp}@example.com`;
  const concurrentRawOtp = '654321';
  const concurrentTokenHash = crypto.createHash('sha256').update(concurrentRawOtp).digest('hex');

  await prisma.pendingRegistration.create({
    data: {
      name: 'Concurrent Race Tester',
      email: concurrentEmail,
      password: '$2a$12$dummyhashforconcurrenttesting123',
      prayerCalculationMethod: 'Karachi',
      tokenHash: concurrentTokenHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      lastSentAt: new Date(),
    },
  });

  // Launch two simultaneous verification attempts with the exact same OTP
  const [resA, resB] = await Promise.all([
    fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: concurrentEmail, otp: concurrentRawOtp }),
    }),
    fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: concurrentEmail, otp: concurrentRawOtp }),
    }),
  ]);

  const statuses = [resA.status, resB.status].sort();
  assert.deepEqual(statuses, [200, 400], 'One concurrent request must succeed with 200, the other must safely fail with 400');

  const pendingCount = await prisma.pendingRegistration.count({ where: { email: concurrentEmail } });
  assert.equal(pendingCount, 0, 'Pending registration must be deleted after concurrent processing');

  const userCount = await prisma.user.count({ where: { email: concurrentEmail } });
  assert.equal(userCount, 1, 'Exactly one user record must be created despite simultaneous requests');
  console.log('✓ Test 16 Passed: Atomic transaction safely handled simultaneous verification requests (1 succeeded, 1 rejected, 0 crashes).');

  // --------------------------------------------------------------------------
  // Test 17: Protected Profile & Password Routes Reject Unverified Users
  // --------------------------------------------------------------------------
  console.log('\n17. Testing Profile & Password Routes Guard for Unverified Users...');
  const profileRes = await fetch(`${BASE_URL}/api/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${unverifiedToken}`,
    },
    body: JSON.stringify({ name: 'Hacked Name' }),
  });
  assert.equal(profileRes.status, 403, 'Unverified user updating profile must receive 403 Forbidden');
  const profileData = await profileRes.json();
  assert.equal(profileData.code, 'EMAIL_NOT_VERIFIED', 'Error code must be EMAIL_NOT_VERIFIED');

  const passwordRes = await fetch(`${BASE_URL}/api/auth/set-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${unverifiedToken}`,
    },
    body: JSON.stringify({ password: 'NewSecurePassword123!' }),
  });
  assert.equal(passwordRes.status, 403, 'Unverified user setting password must receive 403 Forbidden');
  const passwordData = await passwordRes.json();
  assert.equal(passwordData.code, 'EMAIL_NOT_VERIFIED', 'Error code must be EMAIL_NOT_VERIFIED');
  console.log('✓ Test 17 Passed: Profile and password routes strictly block unverified users with 403 EMAIL_NOT_VERIFIED.');

  // Cleanup test users from database
  try {
    await prisma.pendingRegistration.deleteMany({
      where: { email: { in: [testEmail, resendTestEmail, unverifiedEmail, concurrentEmail] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, resendTestEmail, unverifiedEmail, concurrentEmail] } },
    });
    await prisma.$disconnect();
  } catch {}

  console.log('\n🎉 ALL 17 PRODUCTION EMAIL VERIFICATION & SECURITY TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch(async (err) => {
  console.error('\n❌ Test failed with error:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
