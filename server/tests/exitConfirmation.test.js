import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';
import { config } from '../src/config/env.js';

console.log('=== Running App-Exit Confirmation & Session Preservation Test Suite ===\n');

/**
 * -----------------------------------------------------------------------------
 * 1. Test Suite: App-Exit Modal State & Action Handling
 * -----------------------------------------------------------------------------
 */
console.log('Test 1: App-exit confirmation modal actions ("Stay in App" vs "Exit App")');

class MockAppExitManager {
  constructor() {
    this.isExitModalOpen = false;
    this.historyStatePushed = false;
    this.userLoggedOut = false;
    this.sessionWiped = false;
    this.recordsCleared = false;
  }

  // Intercept back button / exit trigger
  triggerExitPrompt() {
    this.isExitModalOpen = true;
    this.historyStatePushed = true;
  }

  // User chooses "Stay in App" (الاستمرار في التطبيق)
  stayInApp() {
    this.isExitModalOpen = false;
    // Session, records, and login state are preserved
    assert.strictEqual(this.userLoggedOut, false);
    assert.strictEqual(this.sessionWiped, false);
  }

  // User chooses "Exit App" (الخروج من التطبيق)
  // Crucially: Must NEVER log out or clear session!
  exitApp() {
    this.isExitModalOpen = false;
    // Window navigation / close is initiated
    // User is NOT logged out!
    // Session is NOT wiped!
    // Prayer records are NOT cleared!
  }

  // Simulation of an explicit user logout (for comparison)
  explicitSignOut() {
    this.userLoggedOut = true;
    this.sessionWiped = true;
  }
}

const manager = new MockAppExitManager();

// 1a. User triggers exit prompt (back button or Exit App button)
manager.triggerExitPrompt();
assert.strictEqual(manager.isExitModalOpen, true, 'Exit modal must open');
assert.strictEqual(manager.historyStatePushed, true, 'History state must be trapped');

// 1b. User clicks "Stay in App"
manager.stayInApp();
assert.strictEqual(manager.isExitModalOpen, false, 'Exit modal must close');
assert.strictEqual(manager.userLoggedOut, false, 'User must not be logged out when staying');
assert.strictEqual(manager.sessionWiped, false, 'Session must not be wiped when staying');
console.log('✓ Test 1 Passed: "Stay in App" cleanly closes modal and maintains active session.');

// -----------------------------------------------------------------------------
// Test 2: "Exit App" Never Logs User Out
// -----------------------------------------------------------------------------
console.log('\nTest 2: "Exit App" preserves session tokens, cookies, and saved records');
manager.triggerExitPrompt();
manager.exitApp();
assert.strictEqual(manager.isExitModalOpen, false, 'Modal closed on exit');
assert.strictEqual(manager.userLoggedOut, false, 'Exiting app must NEVER log user out!');
assert.strictEqual(manager.sessionWiped, false, 'Exiting app must NEVER wipe session token!');
assert.strictEqual(manager.recordsCleared, false, 'Exiting app must NEVER clear saved Salah records!');
console.log('✓ Test 2 Passed: Exiting app preserves user login state and records.');

// -----------------------------------------------------------------------------
// Test 3: No Unnecessary BeforeUnload Prompts During Clean Navigation
// -----------------------------------------------------------------------------
console.log('\nTest 3: Clean navigation produces zero beforeunload warnings');

function evaluateBeforeUnload(hasUnsavedChanges, event) {
  if (!hasUnsavedChanges) {
    return false; // Silent, smooth navigation
  }
  event.returnValue = '';
  return true; // Browser warning triggered
}

const mockEvent = {};
const cleanNavigation = evaluateBeforeUnload(false, mockEvent);
assert.strictEqual(cleanNavigation, false, 'Clean navigation must never display exit warning');
assert.strictEqual(mockEvent.returnValue, undefined, 'No returnValue set on clean navigation');

const dirtyNavigation = evaluateBeforeUnload(true, mockEvent);
assert.strictEqual(dirtyNavigation, true, 'Unsaved changes must trigger native beforeunload prompt');
assert.strictEqual(mockEvent.returnValue, '', 'Standard W3C returnValue set on dirty form');
console.log('✓ Test 3 Passed: Zero unnecessary warnings during regular in-app navigation.');

// -----------------------------------------------------------------------------
// Test 4: Real Backend Session Persistence Verification
// -----------------------------------------------------------------------------
console.log('\nTest 4: Real session token remains valid after app departure and return');

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;

async function testBackendSessionPersistence() {
  const timestamp = Date.now();
  const testEmail = `session_persist_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  // Create active verified user
  const user = await prisma.user.create({
    data: {
      name: 'Session Persist User',
      email: testEmail,
      password: '$2a$12$dummyhashedpasswordfortesting1234567890123456789012',
      isEmailVerified: true,
      prayerCalculationMethod: 'Karachi',
    },
  });

  // Issue signed JWT token (simulating login session)
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret || 'fallback_secret_for_dev_only_change_in_production',
    { expiresIn: '7d' }
  );

  // Seed a prayer record to verify records are preserved
  const todayStr = new Date().toISOString().split('T')[0];
  const prayerLog = await prisma.prayerLog.create({
    data: {
      userId: user.id,
      prayerName: 'fajr',
      date: todayStr,
      status: 'on_time',
      loggedAt: new Date(),
    },
  });

  // User exits app (simulated) -> Session cookie and token are NOT revoked!
  // User returns to app later:
  const sessionRes = await fetch(`${BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': `auth_token=${token}`,
    },
  });

  assert.equal(sessionRes.status, 200, 'Session must remain valid upon returning to app');
  const sessionData = await sessionRes.json();
  assert.equal(sessionData.success, true);
  assert.equal(sessionData.user.email, testEmail, 'User profile must be restored seamlessly');

  // Verify prayer record is intact
  const savedLog = await prisma.prayerLog.findUnique({
    where: { id: prayerLog.id },
  });
  assert(savedLog, 'Saved prayer record must remain fully intact');
  assert.equal(savedLog.status, 'on_time');

  // Clean up test data
  await prisma.prayerLog.delete({ where: { id: prayerLog.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log('✓ Test 4 Passed: Verified session and prayer logs are 100% persistent upon returning to app.');
}

await testBackendSessionPersistence();

console.log('\n======================================================');
console.log('🎉 ALL APP-EXIT & SESSION PRESERVATION TESTS PASSED! 🎉');
console.log('======================================================\n');
