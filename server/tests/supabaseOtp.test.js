import assert from 'node:assert/strict';
import { isSupabaseOtpConfigured, sendSupabaseOtp, verifySupabaseOtp } from '../src/services/supabaseAuthService.js';
import { verifyEmailTransport } from '../src/services/emailService.js';
import { config } from '../src/config/env.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;

console.log('=== Running Supabase Auth OTP Verification Tests ===');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  // Test 1: Supabase Auth OTP Configuration Check
  console.log('1. Checking isSupabaseOtpConfigured()...');
  const configured = isSupabaseOtpConfigured();
  assert.equal(configured, true, 'Supabase Auth OTP must be detected as configured');
  console.log('✓ Test 1 Passed: Supabase Auth OTP is properly configured with URL and keys.');

  // Test 2: Email Transport Health reports Supabase OTP provider
  console.log('\n2. Testing verifyEmailTransport() provider resolution...');
  const health = await verifyEmailTransport();
  assert.equal(health.connected, true, 'Email transport must report connected');
  assert.equal(health.provider, 'supabase_auth_otp', 'Provider must report supabase_auth_otp');
  console.log('✓ Test 2 Passed: Email transport health correctly resolves to supabase_auth_otp.');

  // Test 3: API Email Health Endpoint
  console.log('\n3. Testing GET /api/auth/email-health endpoint...');
  const healthRes = await fetch(`${BASE_URL}/api/auth/email-health`);
  assert.equal(healthRes.status, 200, 'GET /api/auth/email-health must return 200');
  const healthData = await healthRes.json();
  assert.equal(healthData.success, true, 'Email health must report success');
  assert.equal(healthData.connected, true, 'Email health must report connected');
  assert.equal(healthData.provider, 'supabase_auth_otp', 'Email health must report provider supabase_auth_otp');
  console.log('✓ Test 3 Passed: /api/auth/email-health returns 200 with provider supabase_auth_otp.');

  // Test 4: Supabase verifyOtp error handling for fake/invalid token
  console.log('\n4. Testing verifySupabaseOtp() with invalid token rejection...');
  const invalidResult = await verifySupabaseOtp('nonexistent_user_test@example.com', '999999');
  assert.equal(invalidResult.success, false, 'Invalid token must fail verification');
  assert(invalidResult.error, 'Must provide an error message');
  console.log(`✓ Test 4 Passed: Supabase correctly rejected invalid token: ${invalidResult.error}`);

  console.log('\n🎉 ALL 4 SUPABASE AUTH OTP TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
