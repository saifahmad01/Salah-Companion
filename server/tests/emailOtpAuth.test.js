import assert from 'assert';
import { prisma } from '../src/db/prisma.js';
import { otpService } from '../src/services/otpService.js';
import { getOtpEmailHtml, getOtpEmailText } from '../src/services/email/templates/otpEmailTemplate.js';
import { config } from '../src/config/env.js';

const BASE_URL = `http://localhost:${process.env.PORT || 8080}`;

async function runTests() {
  console.log('=== Running Comprehensive Brevo Email + OTP Authentication Tests ===');
  console.log(`Target API: ${BASE_URL}\n`);

  const testEmail = `test_otp_user_${Date.now()}@example.com`;
  const testName = 'Ahmad Al-Farooq';

  // --------------------------------------------------------------------------
  // Test 1: Request OTP (POST /api/auth/send-otp)
  // --------------------------------------------------------------------------
  console.log('1. Testing OTP Generation & Delivery (POST /api/auth/send-otp)...');
  const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({ email: testEmail, name: testName }),
  });

  assert.strictEqual(sendRes.status, 200, `Expected 200, got ${sendRes.status}`);
  const sendData = await sendRes.json();

  assert.strictEqual(sendData.success, true);
  assert.strictEqual(sendData.email, testEmail);
  assert.strictEqual(sendData.cooldownSeconds, 60);
  assert.strictEqual(sendData.expiresInSeconds, 300);
  assert.strictEqual(sendData.otp, undefined, 'CRITICAL: Raw OTP must NEVER be exposed in API responses');

  // Verify DB state
  const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert(dbUser, 'User record must exist in database');
  assert(dbUser.verificationTokenHash, 'verificationTokenHash must be set in database');
  assert(!dbUser.verificationTokenHash.includes(testEmail), 'Token must be cryptographically hashed');
  assert(dbUser.tokenExpiresAt, 'tokenExpiresAt must be set in database');

  // Ensure expiration is ~5 minutes in the future
  const expiryDiffMs = new Date(dbUser.tokenExpiresAt).getTime() - Date.now();
  assert(expiryDiffMs > 4 * 60 * 1000 && expiryDiffMs <= 5 * 60 * 1000 + 5000, 'Expiration must be 5 minutes');

  console.log('✓ Test 1 Passed: OTP generated, securely hashed, and delivered without secret leakage.');

  // --------------------------------------------------------------------------
  // Test 2: Resend Cooldown Enforcement (60s)
  // --------------------------------------------------------------------------
  console.log('\n2. Testing 60-second Resend Cooldown Enforcement...');
  const cooldownRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': config.jwtSecret,
    },
    body: JSON.stringify({ email: testEmail }),
  });

  assert.strictEqual(cooldownRes.status, 429, `Expected 429 for rapid resend, got ${cooldownRes.status}`);
  const cooldownData = await cooldownRes.json();
  assert.strictEqual(cooldownData.code, 'RESEND_COOLDOWN');
  assert(cooldownData.retryAfter > 0 && cooldownData.retryAfter <= 60, 'retryAfter seconds must be provided');

  console.log(`✓ Test 2 Passed: Resend cooldown correctly enforced (${cooldownData.retryAfter}s remaining).`);

  // --------------------------------------------------------------------------
  // Test 3: Incorrect OTP Handling & Attempt Counter
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Incorrect OTP Handling & Attempt Limits...');
  const wrongOtpRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: '000000' }),
  });

  assert.strictEqual(wrongOtpRes.status, 400, `Expected 400 for wrong OTP, got ${wrongOtpRes.status}`);
  const wrongOtpData = await wrongOtpRes.json();
  assert.strictEqual(wrongOtpData.code, 'OTP_MISMATCH');
  assert.strictEqual(wrongOtpData.remainingAttempts, 4, 'Remaining attempts must be 4 after 1 failure');

  // Exhaust all 5 attempts
  for (let attempt = 2; attempt <= 4; attempt++) {
    const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '000000' }),
    });
    const data = await res.json();
    assert.strictEqual(data.remainingAttempts, 5 - attempt);
  }

  // 5th attempt must trigger lockout / token invalidation
  const lockoutRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: '000000' }),
  });

  assert.strictEqual(lockoutRes.status, 403, `Expected 403 for 5th failed attempt, got ${lockoutRes.status}`);
  const lockoutData = await lockoutRes.json();
  assert.strictEqual(lockoutData.code, 'OTP_MAX_ATTEMPTS_EXCEEDED');

  const lockedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  assert.strictEqual(lockedUser.verificationTokenHash, null, 'Token must be invalidated in DB after 5 failures');

  console.log('✓ Test 3 Passed: 5-attempt limit and automatic token invalidation verified.');

  // --------------------------------------------------------------------------
  // Test 4: Expired OTP Rejection
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Expired OTP Rejection...');
  const expiredEmail = `expired_${Date.now()}@example.com`;
  const knownOtp = '786110';
  const hashedKnownOtp = otpService.hashOtp(knownOtp);

  // Seed user with expired token (10 minutes ago)
  await prisma.user.create({
    data: {
      email: expiredEmail,
      name: 'Expired User',
      verificationTokenHash: `${hashedKnownOtp}:0`,
      tokenExpiresAt: new Date(Date.now() - 10 * 60 * 1000),
      isEmailVerified: false,
    },
  });

  const expiredRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: expiredEmail, otp: knownOtp }),
  });

  assert.strictEqual(expiredRes.status, 400);
  const expiredData = await expiredRes.json();
  assert.strictEqual(expiredData.code, 'OTP_EXPIRED');

  console.log('✓ Test 4 Passed: Expired OTP rejected and cleared.');

  // --------------------------------------------------------------------------
  // Test 5: Valid OTP Verification & Session Establishment
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Valid OTP Verification & Authentication...');
  const validEmail = `valid_${Date.now()}@example.com`;
  const validOtp = '555777';
  const hashedValidOtp = otpService.hashOtp(validOtp);

  await prisma.user.create({
    data: {
      email: validEmail,
      name: 'Brother Zaid',
      verificationTokenHash: `${hashedValidOtp}:0`,
      tokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      isEmailVerified: false,
    },
  });

  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: validEmail, otp: validOtp }),
  });

  assert.strictEqual(verifyRes.status, 200, `Expected 200, got ${verifyRes.status}`);
  const verifyData = await verifyRes.json();

  assert.strictEqual(verifyData.success, true);
  assert(verifyData.token, 'JWT session token must be returned');
  assert.strictEqual(verifyData.user.email, validEmail);
  assert.strictEqual(verifyData.user.isEmailVerified, true, 'User must be marked verified');

  // Verify HttpOnly cookie
  const cookieHeader = verifyRes.headers.get('set-cookie');
  assert(cookieHeader && cookieHeader.includes('auth_token='), 'HttpOnly auth_token cookie must be set');

  // Verify DB state cleanup
  const verifiedDbUser = await prisma.user.findUnique({ where: { email: validEmail } });
  assert.strictEqual(verifiedDbUser.isEmailVerified, true);
  assert.strictEqual(verifiedDbUser.verificationTokenHash, null, 'Single-use OTP hash must be cleared upon verification');
  assert.strictEqual(verifiedDbUser.tokenExpiresAt, null, 'Expiration must be cleared');

  console.log('✓ Test 5 Passed: Valid OTP verified, session established, single-use token cleared.');

  // --------------------------------------------------------------------------
  // Test 6: Prevention of Reused OTPs (Single-Use Token)
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Single-Use Invalidation (Preventing OTP Reuse)...');
  const reuseRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: validEmail, otp: validOtp }),
  });

  assert.strictEqual(reuseRes.status, 400);
  const reuseData = await reuseRes.json();
  assert.strictEqual(reuseData.code, 'NO_ACTIVE_OTP');

  console.log('✓ Test 6 Passed: OTP cannot be reused after verification.');

  // --------------------------------------------------------------------------
  // Test 7: Premium Islamic Email Template Design Verification
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Islamic Email Template Content & Design Assets...');
  const sampleOtp = '987654';
  const html = getOtpEmailHtml({ name: 'Tariq', otp: sampleOtp, expiresInMinutes: 5 });
  const text = getOtpEmailText({ name: 'Tariq', otp: sampleOtp, expiresInMinutes: 5 });

  // Emerald and Gold palette
  assert(html.includes('#061F17') || html.includes('#0A382A'), 'Template must include emerald background');
  assert(html.includes('#D4AF37') || html.includes('#E5C67F'), 'Template must include gold accents');

  // Sacred Calligraphy & Branding
  assert(html.includes('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), 'HTML must include Arabic Bismillah');
  assert(html.includes('رفیقِ نماز'), 'HTML must include Arabic calligraphy brand name');
  assert(html.includes('Salah Companion'), 'HTML must include Salah Companion brand');
  assert(html.includes(sampleOtp), 'HTML must contain the 6-digit OTP code');
  assert(html.includes('5 minutes'), 'HTML must display the 5-minute expiry notice');
  assert(html.includes('Security Warning') || html.includes('Security Notice'), 'HTML must contain security warning');
  assert(html.includes('Surah An-Nisa (4:103)'), 'HTML must include Quranic verse on prayer');

  // Plain-text fallback
  assert(text.includes('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), 'Text must include Bismillah');
  assert(text.includes(sampleOtp), 'Text must include 6-digit OTP code');
  assert(text.includes('5 minutes'), 'Text must state 5-minute expiry');

  console.log('✓ Test 7 Passed: Premium Islamic design verified across HTML and plain-text fallback.');

  // --------------------------------------------------------------------------
  // Test 8: Retired Link Endpoints (HTTP 410)
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Legacy Link Retirement (HTTP 410)...');
  const legacyVerifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'legacy_link_token' }),
  });
  assert.strictEqual(legacyVerifyRes.status, 410);

  const legacyGetRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=legacy`, {
    method: 'GET',
    redirect: 'manual',
  });
  assert.strictEqual(legacyGetRes.status, 302, 'Legacy link GET must redirect to /login');

  console.log('✓ Test 8 Passed: Legacy link verification cleanly retired with 410/302.');

  // Clean up test records
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [testEmail, expiredEmail, validEmail],
      },
    },
  });

  console.log('\n======================================================');
  console.log('🎉 ALL 8 BREVO EMAIL + OTP AUTHENTICATION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
