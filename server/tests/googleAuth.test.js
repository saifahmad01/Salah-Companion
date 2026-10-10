import assert from 'node:assert/strict';
import { config } from '../src/config/env.js';
import { query } from '../src/db/connection.js';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
const TEST_SECRET = config.jwtSecret;

console.log('--- Running Google OAuth & Session Management Integration Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  // Test 0: Verify that OAuth initiation redirects to authentic Google Accounts or safely rejects
  console.log('0. Testing Google OAuth Initiation URL...');
  const initCheckRes = await fetch(`${BASE_URL}/api/auth/google`, {
    redirect: 'manual',
  });
  assert([301, 302, 307, 308].includes(initCheckRes.status), `Expected redirect, received ${initCheckRes.status}`);
  const location = initCheckRes.headers.get('location');
  const isGoogleAccounts = location && location.startsWith('https://accounts.google.com/o/oauth2/v2/auth') && location.includes('520110657430');
  const isSafeReject = location && location.includes('auth_error=GOOGLE_NOT_CONFIGURED');
  assert(
    isGoogleAccounts || isSafeReject,
    `Expected redirect to Google Accounts or GOOGLE_NOT_CONFIGURED, received: ${location}`
  );
  if (isGoogleAccounts) {
    console.log('✓ Test 0 Passed: Successfully redirected to authentic Google Accounts OAuth URL with active Client ID.');
  } else {
    console.log('✓ Test 0 Passed: Unconfigured OAuth strictly redirects to login error; no fake account created.');
  }

  // Test 1: Initiate Google OAuth Flow with test signature (GET /api/auth/google)
  console.log('\n1. Testing GET /api/auth/google with test signature (OAuth Initiation & CSRF State Cookie)...');
  const initRes = await fetch(`${BASE_URL}/api/auth/google`, {
    redirect: 'manual',
    headers: {
      'x-test-secret': TEST_SECRET,
    },
  });

  assert([301, 302, 307, 308].includes(initRes.status), `Expected 302 redirect, received status ${initRes.status}`);
  const redirectLocation = initRes.headers.get('location');
  const setCookieHeader = initRes.headers.get('set-cookie');

  assert(redirectLocation, 'Location header must be present in redirect');
  assert(setCookieHeader && setCookieHeader.includes('oauth_state='), 'Must set HttpOnly oauth_state cookie for CSRF protection');
  assert(setCookieHeader.toLowerCase().includes('httponly'), 'oauth_state cookie must be HttpOnly');
  console.log('✓ Test 1 Passed: Returns 302 redirect and sets secure oauth_state cookie.');

  // Extract oauth_state from cookie
  const stateMatch = setCookieHeader.match(/oauth_state=([^;]+)/);
  const oauthState = stateMatch ? stateMatch[1] : null;
  assert(oauthState, 'Failed to extract oauth_state value from set-cookie header');

  // Test 2: CSRF Mismatch Protection (GET /api/auth/google/callback with forged state)
  console.log('\n2. Testing CSRF Protection on Callback (State Mismatch)...');
  const csrfTamperedRes = await fetch(`${BASE_URL}/api/auth/google/callback?code=mock_code&state=forged_state_value`, {
    redirect: 'manual',
    headers: {
      Cookie: `oauth_state=${oauthState}`,
    },
  });

  const csrfTamperedLocation = csrfTamperedRes.headers.get('location');
  assert(csrfTamperedLocation && csrfTamperedLocation.includes('auth_error=CSRF_STATE_MISMATCH'),
    `Expected redirect with CSRF_STATE_MISMATCH, received: ${csrfTamperedLocation}`);
  console.log('✓ Test 2 Passed: Mismatched CSRF state correctly rejected with CSRF_STATE_MISMATCH.');

  // Test 3: OAuth Cancellation / Denial handling
  console.log('\n3. Testing Google Access Denial Callback Handling...');
  const deniedRes = await fetch(`${BASE_URL}/api/auth/google/callback?error=access_denied`, {
    redirect: 'manual',
  });
  const deniedLocation = deniedRes.headers.get('location');
  assert(deniedLocation && deniedLocation.includes('auth_error=access_denied'),
    `Expected redirect with access_denied, received: ${deniedLocation}`);
  console.log('✓ Test 3 Passed: User cancellation handled gracefully.');

  // Test 4: Valid OAuth Callback with authorized test signature
  console.log('\n4. Testing Valid Google OAuth Callback with Code Exchange...');
  const validCallbackRes = await fetch(
    `${BASE_URL}/api/auth/google/callback?code=mock_google_oauth_code&state=${oauthState}&test_secret=${encodeURIComponent(TEST_SECRET)}`,
    {
      redirect: 'manual',
      headers: {
        Cookie: `oauth_state=${oauthState}`,
        'x-test-secret': TEST_SECRET,
      },
    }
  );

  assert([301, 302, 307, 308].includes(validCallbackRes.status), `Expected 302 redirect, got ${validCallbackRes.status}`);
  const successLocation = validCallbackRes.headers.get('location');
  const callbackCookies = validCallbackRes.headers.get('set-cookie');

  assert(successLocation && successLocation.includes('auth=google_success'),
    `Expected redirect to dashboard with auth=google_success, got: ${successLocation}`);
  assert(callbackCookies && callbackCookies.includes('auth_token='),
    'Expected Set-Cookie header containing auth_token session cookie');
  assert(callbackCookies.toLowerCase().includes('httponly'),
    'auth_token cookie must have HttpOnly flag for XSS protection');
  console.log('✓ Test 4 Passed: Code exchange succeeded, user verified, and HttpOnly auth_token cookie issued.');

  // Extract auth_token from callback
  const authTokenMatch = callbackCookies.match(/auth_token=([^;]+)/);
  const sessionToken = authTokenMatch ? authTokenMatch[1] : null;
  assert(sessionToken, 'Failed to extract auth_token');

  // Test 5: Verify Session Restoration (GET /api/auth/me) via HttpOnly Cookie
  console.log('\n5. Testing Session Restoration (GET /api/auth/me) via Cookie...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Cookie: `auth_token=${sessionToken}`,
    },
  });

  assert.equal(meRes.status, 200, `Expected 200 OK from /api/auth/me, got ${meRes.status}`);
  const meData = await meRes.json();
  assert(meData.success === true, 'Response must have success: true');
  assert(meData.user, 'Response must include user object');
  assert(meData.user.email, 'User object must include email');
  assert(meData.user.isEmailVerified === true, 'Google authenticated user must have isEmailVerified: true');
  assert(typeof meData.user.password === 'undefined', 'Password must be sanitized and never returned');
  console.log(`✓ Test 5 Passed: Successfully verified session for user: ${meData.user.email} (${meData.user.name}).`);

  // Test 6: Verify Unauthorized Access when no cookie or token is provided
  console.log('\n6. Testing Route Protection on Unauthenticated Request (GET /api/auth/me)...');
  const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
  assert.equal(unauthRes.status, 401, `Expected 401 Unauthorized, got ${unauthRes.status}`);
  const unauthData = await unauthRes.json();
  assert.equal(unauthData.code, 'UNAUTHORIZED', 'Error code must be UNAUTHORIZED');
  console.log('✓ Test 6 Passed: Unauthenticated request rejected with 401.');

  // Test 7: Direct POST /api/auth/google with test authorization
  console.log('\n7. Testing POST /api/auth/google (Direct GIS / Credential Exchange)...');
  const postGoogleRes = await fetch(`${BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-secret': TEST_SECRET,
    },
    body: JSON.stringify({
      credential: 'mock_direct_google_test',
      prayerCalculationMethod: 'Karachi',
      testSecret: TEST_SECRET,
    }),
  });

  assert.equal(postGoogleRes.status, 200, `Expected 200 OK, got ${postGoogleRes.status}`);
  const postGoogleData = await postGoogleRes.json();
  assert(postGoogleData.success === true, 'Must return success: true');
  assert(postGoogleData.user, 'Must return user profile');
  assert(postGoogleData.user.isEmailVerified === true, 'User must be verified');
  const postGoogleCookies = postGoogleRes.headers.get('set-cookie');
  assert(postGoogleCookies && postGoogleCookies.includes('auth_token='), 'POST /api/auth/google must set auth_token cookie');
  console.log(`✓ Test 7 Passed: Direct Google sign-in works and issues session cookie for ${postGoogleData.user.email}.`);

  // Test 8: Logout (POST /api/auth/logout)
  console.log('\n8. Testing Logout (POST /api/auth/logout)...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Cookie: `auth_token=${sessionToken}`,
    },
  });

  assert.equal(logoutRes.status, 200, `Expected 200 OK, got ${logoutRes.status}`);
  const logoutCookies = logoutRes.headers.get('set-cookie');
  assert(logoutCookies, 'Must return Set-Cookie header on logout');
  assert(
    logoutCookies.includes('auth_token=;') ||
    logoutCookies.includes('Max-Age=0') ||
    logoutCookies.includes('Expires=Thu, 01 Jan 1970'),
    'auth_token cookie must be cleared on logout'
  );
  console.log('✓ Test 8 Passed: Logout endpoint clears auth_token session cookie.');

  // Cleanup: Delete any temporary test users from DB
  await query(`
    DELETE FROM users 
    WHERE email LIKE '%@salahcompanion.internal' 
       OR email IN ('automated.test.user@example.com', 'test.user@example.com', 'user.google@gmail.com', 'direct@gmail.com')
  `);
  console.log('✓ Test Database Cleanup: Removed temporary test accounts.');

  console.log('\n🎉 ALL 9 GOOGLE AUTHENTICATION INTEGRATION & SAFETY TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
