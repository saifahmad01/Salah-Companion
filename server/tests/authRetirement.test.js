import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';
import { config } from '../src/config/env.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;

console.log('=== Running Email Authentication Retirement & OAuth Integration Tests ===');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  const timestamp = Date.now();

  // --------------------------------------------------------------------------
  // Test 1: Verify Old Email Login Endpoints are Retired (Return 410 Gone)
  // --------------------------------------------------------------------------
  console.log('1. Testing Retirement of Email Login & Verification Endpoints (410 Gone)...');
  const retiredPostEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-otp',
    '/api/auth/send-otp',
    '/api/auth/resend-otp',
    '/api/auth/resend-verification',
    '/api/auth/verify-email',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ];

  for (const endpoint of retiredPostEndpoints) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `test_${timestamp}@example.com`, password: 'Password123!' }),
    });

    assert.equal(
      res.status,
      410,
      `Expected ${endpoint} to return HTTP 410 Gone, received ${res.status}`
    );
    const data = await res.json();
    assert.equal(data.code, 'EMAIL_AUTH_RETIRED', `Expected code EMAIL_AUTH_RETIRED on ${endpoint}`);
  }
  console.log('✓ Test 1 Passed: All 9 retired email authentication endpoints returned HTTP 410 EMAIL_AUTH_RETIRED.');

  // --------------------------------------------------------------------------
  // Test 2: Verify GET /api/auth/verify-email Redirects to Login
  // --------------------------------------------------------------------------
  console.log('\n2. Testing GET /api/auth/verify-email redirect...');
  const getVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=legacy_token`, {
    method: 'GET',
    redirect: 'manual',
  });
  assert([301, 302, 307, 308].includes(getVerifyRes.status), `Expected redirect, got ${getVerifyRes.status}`);
  const redirectLoc = getVerifyRes.headers.get('location');
  assert(redirectLoc && redirectLoc.includes('notice=use_google'), 'Must redirect to login with notice=use_google');
  console.log('✓ Test 2 Passed: Legacy verify-email GET request cleanly redirects to login.');

  // --------------------------------------------------------------------------
  // Test 3: Google OAuth Sign-In & Account Linking
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Google OAuth Authentication (POST /api/auth/google)...');
  const googleUserEmail = `google_oauth_${timestamp}@example.com`;
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

  assert.equal(googleRes.status, 200, `Expected 200 OK for Google OAuth, got ${googleRes.status}`);
  const googleData = await googleRes.json();
  assert.equal(googleData.success, true);
  assert(googleData.token, 'Must return JWT auth token');
  assert(googleData.user, 'Must return user profile');
  const token = googleData.token;
  console.log('✓ Test 3 Passed: Google OAuth successfully authenticated user and returned JWT session.');

  // --------------------------------------------------------------------------
  // Test 4: Email Verification Requirement Removed from Protected Routes
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Access to Protected Routes Without Email Verification Blocking...');
  const testEmail = `unverified_user_${timestamp}@example.com`;
  const createdUser = await prisma.user.create({
    data: {
      name: 'Unverified Test User',
      email: testEmail,
      isEmailVerified: false, // Explicitly false
      prayerCalculationMethod: 'Karachi',
    },
  });

  const unverifiedToken = jwt.sign(
    { id: createdUser.id, email: createdUser.email, role: 'USER' },
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  // Attempt accessing protected prayer route
  const prayerRes = await fetch(`${BASE_URL}/api/prayers/today`, {
    headers: { Authorization: `Bearer ${unverifiedToken}` },
  });

  assert.equal(
    prayerRes.status,
    200,
    `Protected route must allow access without requiring email verification, got ${prayerRes.status}`
  );
  console.log('✓ Test 4 Passed: Protected routes no longer block users with EMAIL_NOT_VERIFIED.');

  // --------------------------------------------------------------------------
  // Test 5: User Profile Update & Logout
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Profile Update & Logout...');
  const profileRes = await fetch(`${BASE_URL}/api/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: 'Updated Google Name' }),
  });
  assert.equal(profileRes.status, 200);

  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logoutRes.status, 200);
  console.log('✓ Test 5 Passed: Profile update and logout functional.');

  // Clean up
  try {
    await prisma.user.deleteMany({
      where: { email: { in: [testEmail, 'mock_direct_google_test@gmail.com'] } },
    });
    await prisma.$disconnect();
  } catch {}

  console.log('\n======================================================');
  console.log('🎉 ALL AUTH RETIREMENT & GOOGLE OAUTH TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

runTests().catch(async (err) => {
  console.error('\n❌ Test failed with error:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
