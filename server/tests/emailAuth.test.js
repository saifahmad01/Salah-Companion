import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
  // Test 1: User Registration
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
  assert.equal(regData.success, true, 'Registration must be successful');
  assert.equal(regData.requiresEmailVerification, true, 'Must require email verification');
  assert(regData.previewUrl, 'Must return preview URL with token');
  console.log('✓ Test 1 Passed: User registered, requires verification.');

  // Extract raw token from verificationUrl or previewUrl
  const rawTokenUrl = regData.verificationUrl || regData.previewUrl;
  const tokenMatch = rawTokenUrl.match(/token=([a-f0-9]+)/);
  assert(tokenMatch, 'Failed to extract raw verification token from verification URL');
  const rawToken = tokenMatch[1];
  console.log(`  Extracted Raw Token (sent in email): ${rawToken.substring(0, 16)}... (length: ${rawToken.length})`);

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

  // Verify that rawToken is NEVER in the database!
  assert.notEqual(dbPending.tokenHash, rawToken, 'Raw token must NEVER be stored in the database!');

  // Verify that stored hash matches SHA-256 of the raw token
  const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.equal(dbPending.tokenHash, expectedHash, 'Stored token hash must equal SHA-256(rawToken)');
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
  // Test 5: Invalid / Tampered Token Verification
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Invalid Token Verification (POST /api/auth/verify-email)...');
  const invalidTokenRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'tampered_or_invalid_hex_token_1234567890abcdef',
    }),
  });
  assert.equal(invalidTokenRes.status, 400, 'Tampered token must return 400 Bad Request');
  const invalidTokenData = await invalidTokenRes.json();
  assert.equal(invalidTokenData.code, 'TOKEN_INVALID', 'Code must be TOKEN_INVALID');
  console.log('✓ Test 5 Passed: Tampered verification token correctly rejected.');

  // --------------------------------------------------------------------------
  // Test 6: Expired Token Verification
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Expired Token Rejection...');
  const expiredEmail = `expired_${timestamp}@example.com`;
  const expiredRawToken = crypto.randomBytes(32).toString('hex');
  const expiredTokenHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
  // Insert expired pending registration record
  await prisma.pendingRegistration.create({
    data: {
      name: 'Expired User',
      email: expiredEmail,
      password: 'hashedpass',
      prayerCalculationMethod: 'Karachi',
      tokenHash: expiredTokenHash,
      expiresAt: new Date(Date.now() - 3600 * 1000),
      lastSentAt: new Date(Date.now() - 3600 * 1000),
    },
  });

  const expiredVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: expiredRawToken }),
  });
  assert.equal(expiredVerifyRes.status, 400, 'Expired token must return 400 Bad Request');
  const expiredVerifyData = await expiredVerifyRes.json();
  assert.equal(expiredVerifyData.code, 'TOKEN_EXPIRED', 'Code must be TOKEN_EXPIRED');
  console.log('✓ Test 6 Passed: Expired verification token correctly rejected.');

  // --------------------------------------------------------------------------
  // Test 7: Successful Email Verification via Valid Raw Token
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Valid Token Verification (POST /api/auth/verify-email)...');
  const validVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });

  assert.equal(validVerifyRes.status, 200, `Expected 200 OK for valid token, got ${validVerifyRes.status}`);
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
  // Test 8: Single-Use Token Reuse Prevention
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Token Reuse Prevention (Re-submitting already used token)...');
  const reusedVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });
  assert.equal(reusedVerifyRes.status, 400, 'Reusing a token must be rejected with 400');
  const reusedData = await reusedVerifyRes.json();
  assert.equal(reusedData.code, 'TOKEN_INVALID', 'Must return TOKEN_INVALID for reused token');
  console.log('✓ Test 8 Passed: Replay/reuse of consumed token blocked.');

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Resend Tester',
      email: resendTestEmail,
      password: testPassword,
    }),
  });
  assert.equal(reg2Res.status, 201);

  // Attempting resend immediately should be rate-limited
  const immediateResendRes = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
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
  // Test 11: Clear Actionable Feedback on Unknown Resend & Duplicate Registration
  // --------------------------------------------------------------------------
  console.log('\n11. Testing Clear Actionable Feedback on Unknown Resend & Duplicate Registration...');
  // Resend on non-existent email clearly informs user to create account
  const unknownResendRes = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `random_unknown_${timestamp}@example.com` }),
  });
  assert.equal(unknownResendRes.status, 404, 'Unknown email resend must return 404 Not Found');
  const unknownResendData = await unknownResendRes.json();
  assert.equal(unknownResendData.code, 'ACCOUNT_NOT_FOUND', 'Code must be ACCOUNT_NOT_FOUND');
  assert(unknownResendData.error.toLowerCase().includes('no account found'), 'Must instruct user to create account');

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
  console.log('✓ Test 11 Passed: Clear actionable error messages for unknown email resend (404) and duplicate register (409).');

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
  // Test 13: Direct Browser Email Click -> Auto-Activate, Session Cookie & Dashboard Redirect
  // --------------------------------------------------------------------------
  console.log('\n13. Testing "Verify My Email" Click: Auto-Login & Direct Dashboard Redirect...');
  const autoEmail = `autologin_${timestamp}@example.com`;
  const autoRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Auto Login User',
      email: autoEmail,
      password: testPassword,
    }),
  });
  assert.equal(autoRegRes.status, 201);
  const autoRegData = await autoRegRes.json();
  const autoTokenMatch = (autoRegData.verificationUrl || autoRegData.previewUrl).match(/token=([a-f0-9]+)/);
  assert(autoTokenMatch, 'Must extract token for auto-login test');
  const autoToken = autoTokenMatch[1];

  // Browser clicks the verification link (GET request with browser Accept header)
  const clickRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=${autoToken}`, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'manual', // Intercept 302 redirect
  });

  assert.equal(clickRes.status, 302, `Expected 302 redirect to dashboard, got ${clickRes.status}`);
  const redirectLocation = clickRes.headers.get('location');
  assert(redirectLocation, 'Must return redirect Location header');
  assert(redirectLocation.includes('verified=true'), 'Redirect must include verified=true');
  assert(redirectLocation.includes('token='), 'Redirect must include token query param for client storage');
  assert(redirectLocation.includes(encodeURIComponent(autoEmail)), 'Redirect must include user email');

  // Verify HttpOnly auth_token session cookie is set
  const autoCookie = clickRes.headers.get('set-cookie');
  assert(autoCookie && autoCookie.includes('auth_token='), 'Must set HttpOnly auth_token session cookie on redirect');
  const cookieValue = autoCookie.split(';')[0];

  // Verify database: pending deleted, active user created with isEmailVerified = true
  const dbAutoUser = await prisma.user.findUnique({ where: { email: autoEmail } });
  assert(dbAutoUser, 'User must now exist in users table');
  assert.equal(dbAutoUser.isEmailVerified, true, 'isEmailVerified must be true');
  const dbAutoPending = await prisma.pendingRegistration.findUnique({ where: { email: autoEmail } });
  assert.equal(dbAutoPending, null, 'Pending registration must be deleted');

  // Verify the issued session cookie can immediately access protected route /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': cookieValue },
  });
  assert.equal(meRes.status, 200, 'User session cookie must immediately authenticate /api/auth/me');
  const meData = await meRes.json();
  assert.equal(meData.user.email, autoEmail, 'Authenticated user must match verified email');
  console.log(`✓ Test 13 Passed: "Verify My Email" automatically activated account, established session cookie, and redirected to dashboard.`);

  // Cleanup test users from database
  try {
    await prisma.pendingRegistration.deleteMany({
      where: { email: { in: [testEmail, expiredEmail, autoEmail] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, expiredEmail, autoEmail] } },
    });
    await prisma.$disconnect();
  } catch {}

  console.log('\n🎉 ALL 13 EMAIL & PASSWORD AUTHENTICATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch(async (err) => {
  console.error('\n❌ Test failed with error:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
