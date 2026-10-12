import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma.js';
import { config } from '../src/config/env.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;
const JWT_SECRET = config.jwtSecret;

console.log('=== Running Qibla & Friday Jumu\'ah Comprehensive Tests ===\n');

// -------------------------------------------------------------
// Part 1: Geodesic Qibla Math & Circular Filter Unit Tests
// -------------------------------------------------------------
const KAABA_COORDINATES = {
  latitude: 21.422487,
  longitude: 39.826206,
};
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371.0088;

function isValidCoordinate(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    isFinite(latitude) &&
    isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeAngle(degrees) {
  if (isNaN(degrees) || !isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

function shortestAngularDifference(fromAngle, toAngle) {
  let diff = (toAngle - fromAngle) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

function calculateQiblaBearing(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) return 0;
  const latDiff = Math.abs(latitude - KAABA_COORDINATES.latitude);
  const lngDiff = Math.abs(longitude - KAABA_COORDINATES.longitude);
  if (latDiff < 0.0005 && lngDiff < 0.0005) return 0;

  const phi1 = latitude * DEG_TO_RAD;
  const phi2 = KAABA_COORDINATES.latitude * DEG_TO_RAD;
  const deltaLambda = (KAABA_COORDINATES.longitude - longitude) * DEG_TO_RAD;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  let bearing = Math.atan2(y, x) * RAD_TO_DEG;
  bearing = normalizeAngle(bearing);
  return Math.round(bearing * 10) / 10;
}

function calculateDistanceToKaabaKm(latitude, longitude) {
  if (!isValidCoordinate(latitude, longitude)) return 0;
  const phi1 = latitude * DEG_TO_RAD;
  const phi2 = KAABA_COORDINATES.latitude * DEG_TO_RAD;
  const deltaPhi = (KAABA_COORDINATES.latitude - latitude) * DEG_TO_RAD;
  const deltaLambda = (KAABA_COORDINATES.longitude - longitude) * DEG_TO_RAD;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c);
}

function smoothHeadingEMA(prevHeading, newHeading, alpha = 0.22, deadbandDegrees = 0.3) {
  if (prevHeading === null || isNaN(prevHeading)) {
    return normalizeAngle(newHeading);
  }
  const diff = shortestAngularDifference(prevHeading, newHeading);
  if (Math.abs(diff) < deadbandDegrees) {
    return prevHeading;
  }
  const smoothed = prevHeading + alpha * diff;
  return normalizeAngle(smoothed);
}

function updateContinuousHeading(currentContinuous, newRawHeading, alpha = 0.22, deadbandDegrees = 0.3) {
  const currentAngleMod = normalizeAngle(currentContinuous);
  const diff = shortestAngularDifference(currentAngleMod, newRawHeading);
  if (Math.abs(diff) < deadbandDegrees) {
    return currentContinuous;
  }
  return currentContinuous + diff * alpha;
}

async function runQiblaMathTests() {
  console.log('--- 1. Testing Great-Circle Qibla Azimuth Calculations ---');

  // Test New Delhi
  const delhiBearing = calculateQiblaBearing(28.6139, 77.2090);
  assert.ok(Math.abs(delhiBearing - 266.6) <= 0.6, `New Delhi bearing should be ~266.6°, got ${delhiBearing}°`);
  const delhiDistance = calculateDistanceToKaabaKm(28.6139, 77.2090);
  assert.ok(delhiDistance >= 3750 && delhiDistance <= 3900, `New Delhi distance should be ~3830 km, got ${delhiDistance} km`);
  console.log(`✓ New Delhi: ${delhiBearing}° bearing, ${delhiDistance} km to Kaaba`);

  // Test London
  const londonBearing = calculateQiblaBearing(51.5074, -0.1278);
  assert.ok(Math.abs(londonBearing - 119.0) <= 0.6, `London bearing should be ~119.0°, got ${londonBearing}°`);
  const londonDistance = calculateDistanceToKaabaKm(51.5074, -0.1278);
  assert.ok(londonDistance >= 4700 && londonDistance <= 4850, `London distance should be ~4785 km, got ${londonDistance} km`);
  console.log(`✓ London: ${londonBearing}° bearing, ${londonDistance} km to Kaaba`);

  // Test New York City
  const nyBearing = calculateQiblaBearing(40.7128, -74.0060);
  assert.ok(Math.abs(nyBearing - 58.5) <= 0.6, `New York bearing should be ~58.5°, got ${nyBearing}°`);
  const nyDistance = calculateDistanceToKaabaKm(40.7128, -74.0060);
  assert.ok(nyDistance >= 10200 && nyDistance <= 10400, `New York distance should be ~10290 km, got ${nyDistance} km`);
  console.log(`✓ New York: ${nyBearing}° bearing, ${nyDistance} km to Kaaba`);

  // Test Tokyo
  const tokyoBearing = calculateQiblaBearing(35.6762, 139.6503);
  assert.ok(Math.abs(tokyoBearing - 293.0) <= 0.6, `Tokyo bearing should be ~293.0°, got ${tokyoBearing}°`);
  console.log(`✓ Tokyo: ${tokyoBearing}° bearing`);

  // Test Kaaba location
  const kaabaBearing = calculateQiblaBearing(21.422487, 39.826206);
  assert.equal(kaabaBearing, 0, 'Bearing at Kaaba must be 0°');
  const kaabaDist = calculateDistanceToKaabaKm(21.422487, 39.826206);
  assert.equal(kaabaDist, 0, 'Distance at Kaaba must be 0 km');
  console.log(`✓ Holy Kaaba: 0° bearing, 0 km distance`);

  // Test coordinate validation
  assert.equal(calculateQiblaBearing(95, 30), 0, 'Invalid latitude > 90 must return 0');
  assert.equal(calculateQiblaBearing(-95, 30), 0, 'Invalid latitude < -90 must return 0');
  assert.equal(calculateQiblaBearing(25, 200), 0, 'Invalid longitude > 180 must return 0');
  assert.equal(calculateQiblaBearing(NaN, 30), 0, 'NaN coordinate must return 0');
  console.log('✓ Coordinate validation: correctly guards against invalid/out-of-bounds inputs');

  // Test angular shortest difference across 360° wrap
  const wrapDiff1 = shortestAngularDifference(350, 10);
  assert.equal(wrapDiff1, 20, 'Shortest difference from 350° to 10° must be +20°');
  const wrapDiff2 = shortestAngularDifference(10, 350);
  assert.equal(wrapDiff2, -20, 'Shortest difference from 10° to 350° must be -20°');
  const wrapDiff3 = shortestAngularDifference(180, 180);
  assert.equal(wrapDiff3, 0, 'Shortest difference between identical angles must be 0°');
  console.log('✓ Circular math: shortestAngularDifference correctly resolves shortest circular paths');

  // Test EMA smoothing and deadband
  const smoothedNoJitter = smoothHeadingEMA(260, 260.15, 0.22, 0.25);
  assert.equal(smoothedNoJitter, 260, 'Jitter within 0.25° deadband must be filtered out');
  const smoothedTurn = smoothHeadingEMA(260, 270, 0.2, 0.25);
  assert.ok(Math.abs(smoothedTurn - 262) <= 0.05, `EMA should smoothly step towards target, got ${smoothedTurn}`);
  console.log('✓ EMA filter: deadband prevents sensor flutter and smoothly interpolates turns');

  // Test continuous unwrapped heading without 360° spin
  let continuous = 359;
  const unwrapped1 = updateContinuousHeading(continuous, 1, 0.5, 0.1);
  assert.ok(unwrapped1 > 359 && unwrapped1 <= 361, `Unwrapped heading across 0° must step smoothly to 360°+, got ${unwrapped1}`);
  console.log('✓ Unwrapped heading: eliminates 360-degree rewind jump glitches');
}

// -------------------------------------------------------------
// Part 2: Friday Jumu'ah Slot Unification & API Tests
// -------------------------------------------------------------
async function runFridayJumuahApiTests() {
  console.log('\n--- 2. Testing Friday Jumu\'ah API & Tracker Behavior ---');

  const testEmail = `jumuah_test_${Date.now()}@salahcompanion.internal`;

  const user = await prisma.user.create({
    data: {
      name: 'Jumuah Test User',
      email: testEmail,
      role: 'USER',
      isEmailVerified: true,
      latitude: 28.6139,
      longitude: 77.2090,
    },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
  assert.ok(token, 'Must generate JWT token');

  // Test Friday: 2026-10-16 is Friday
  const testFridayKey = '2026-10-16';
  const testThursdayKey = '2026-10-15';
  const testFridaySimTime = new Date('2026-10-16T13:15:00+05:30');

  // 1. GET /api/prayers/today for Thursday returns 'Dhuhr'
  const thuRes = await fetch(`${BASE_URL}/api/prayers/today?date=${testThursdayKey}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(thuRes.status, 200);
  const thuJson = await thuRes.json();
  const thuMidday = thuJson.prayers.find((p) => p.prayerName === 'Dhuhr');
  assert.ok(thuMidday, 'Thursday midday slot must be named Dhuhr');
  assert.equal(thuJson.prayers.length, 5, 'Thursday must have exactly 5 slots');
  console.log('✓ Thursday schedule: midday slot is correctly named Dhuhr (normal day preserved)');

  // 2. GET /api/prayers/today for Friday returns 'Jumu\'ah'
  const friRes = await fetch(`${BASE_URL}/api/prayers/today?date=${testFridayKey}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(friRes.status, 200);
  const friJson = await friRes.json();
  const friMidday = friJson.prayers.find((p) => p.prayerName === "Jumu'ah");
  assert.ok(friMidday, "Friday midday slot must be named Jumu'ah");
  assert.equal(friJson.prayers.length, 5, 'Friday must have exactly 5 slots (no dual Dhuhr+Jumu\'ah)');
  console.log('✓ Friday schedule: midday slot is named Jumu\'ah and preserves exactly 5 total slots');

  // 3. Weekly schedule returns Jumu'ah on Friday and Dhuhr on other days
  const weeklyRes = await fetch(`${BASE_URL}/api/prayers/weekly?startDate=2026-10-12`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(weeklyRes.status, 200);
  const weeklyJson = await weeklyRes.json();
  const friDayItem = weeklyJson.data.days.find((d) => d.date === testFridayKey);
  assert.ok(friDayItem, 'Friday must exist in weekly schedule');
  const friMiddayWeekly = friDayItem.prayers.find((p) => p.id === 'dhuhr');
  assert.equal(friMiddayWeekly.name, "Jumu'ah", "Weekly midday prayer on Friday must be named Jumu'ah");

  const thuDayItem = weeklyJson.data.days.find((d) => d.date === testThursdayKey);
  const thuMiddayWeekly = thuDayItem.prayers.find((p) => p.id === 'dhuhr');
  assert.equal(thuMiddayWeekly.name, 'Dhuhr', 'Weekly midday prayer on Thursday must be named Dhuhr');
  console.log('✓ Weekly schedule: displays Jumu\'ah on Friday and Dhuhr on other weekdays');

  // 4. Log Jumu'ah on Friday
  const logJumuahRes = await fetch(`${BASE_URL}/api/prayers/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-test-now': testFridaySimTime.toISOString(),
    },
    body: JSON.stringify({
      prayerName: "Jumu'ah",
      date: testFridayKey,
      status: 'on_time',
    }),
  });
  assert.equal(logJumuahRes.status, 200, 'Logging Jumu\'ah on Friday must succeed');
  const logJumuahJson = await logJumuahRes.json();
  assert.equal(logJumuahJson.data.log.prayerName, "Jumu'ah");
  console.log('✓ Logging Jumu\'ah on Friday: successfully recorded as Jumu\'ah');

  // 5a. Repeated identical logging of Dhuhr returns unified Jumu'ah record idempotently
  const logIdenticalDhuhrRes = await fetch(`${BASE_URL}/api/prayers/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-test-now': testFridaySimTime.toISOString(),
    },
    body: JSON.stringify({
      prayerName: 'dhuhr',
      date: testFridayKey,
      status: 'on_time',
    }),
  });
  assert.equal(logIdenticalDhuhrRes.status, 200);
  const logIdenticalJson = await logIdenticalDhuhrRes.json();
  assert.equal(logIdenticalJson.data.log.id, logJumuahJson.data.log.id, 'Must refer to same unified slot');
  console.log('✓ Friday slot unification (idempotent): Dhuhr and Jumu\'ah resolve to identical slot record');

  // 5b. Attempting to log Dhuhr with different status without isCorrection must be rejected with 409
  const logDupDhuhrRes = await fetch(`${BASE_URL}/api/prayers/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-test-now': testFridaySimTime.toISOString(),
    },
    body: JSON.stringify({
      prayerName: 'dhuhr',
      date: testFridayKey,
      status: 'late',
    }),
  });
  assert.equal(logDupDhuhrRes.status, 409, 'Logging Dhuhr with different status after Jumu\'ah on Friday must be rejected as duplicate');
  const logDupJson = await logDupDhuhrRes.json();
  assert.equal(logDupJson.code, 'PRAYER_ALREADY_COMPLETED');
  assert.ok(
    logDupJson.error.includes("Jumu'ah") || logDupJson.error.includes("Friday midday"),
    'Duplicate error must clarify Friday midday unification'
  );
  console.log('✓ Friday slot unification: rejects recording both Dhuhr and Jumu\'ah as separate completed slots');

  // Cleanup test user
  await prisma.prayerLog.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('✓ Cleaned up test records');
}

async function run() {
  try {
    await runQiblaMathTests();
    await runFridayJumuahApiTests();
    console.log('\n======================================================');
    console.log('✅ ALL QIBLA & FRIDAY JUMU\'AH VERIFICATION TESTS PASSED');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
