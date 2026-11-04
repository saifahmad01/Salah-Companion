import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

const BASE_URL = process.env.TEST_API_URL || `http://localhost:${config.port || 8080}`;
const JWT_SECRET = config.jwtSecret;

console.log('--- Running Historical Salah Correction Workflow Tests ---');
console.log(`Target API: ${BASE_URL}\n`);

async function runTests() {
  const timestamp = Date.now();
  const testUserEmail = `correction.user.${timestamp}@example.com`;
  const testAdminEmail = `correction.admin.${timestamp}@example.com`;

  // Create test user and admin
  const user = await prisma.user.create({
    data: {
      name: 'Correction User',
      email: testUserEmail,
      role: 'USER',
      isEmailVerified: true,
      prayerCalculationMethod: 'Karachi',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Correction Admin',
      email: testAdminEmail,
      role: 'ADMIN',
      isEmailVerified: true,
      prayerCalculationMethod: 'Karachi',
    },
  });

  const userToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const pastDate = '2026-10-15';
  const futureDate = '2029-12-31';

  try {
    // ------------------------------------------------------------------------
    // Test 1: Forbid correction request on future date
    // ------------------------------------------------------------------------
    console.log('1. Testing rejection of correction requests on future dates...');
    const futureRes = await fetch(`${BASE_URL}/api/prayers/corrections/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        prayerName: 'fajr',
        prayerDate: futureDate,
        requestedStatus: 'on_time',
        reason: 'Tried to correct future prayer',
      }),
    });
    const futureData = await futureRes.json();
    assert.equal(futureRes.status, 400, 'Future dates must return 400 Bad Request');
    assert.equal(futureData.code, 'NOT_A_PAST_DATE');
    console.log('✓ Test 1 Passed: Future date correction rejected with 400.');

    // ------------------------------------------------------------------------
    // Test 2: Submit valid historical correction request
    // ------------------------------------------------------------------------
    console.log('2. Testing submission of valid historical correction request...');
    const submitRes = await fetch(`${BASE_URL}/api/prayers/corrections/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        prayerName: 'dhuhr',
        prayerDate: pastDate,
        requestedStatus: 'on_time',
        reason: 'Offered in congregation at masjid, forgot to log on time',
        notes: 'Jamaat at 1:30 PM',
      }),
    });
    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 201, 'Valid submission must return 201 Created');
    assert.equal(submitData.success, true);
    assert.equal(submitData.data.status, 'PENDING_APPROVAL');
    assert.equal(submitData.data.requestedStatus, 'on_time');

    const requestId = submitData.data.id;

    // Verify prayer_logs remains UNCHANGED immediately after submission
    const unapprovedLog = await prisma.prayerLog.findFirst({
      where: { userId: user.id, date: pastDate, prayerName: 'Dhuhr' },
    });
    assert.equal(unapprovedLog, null, 'Prayer log must NOT be created before admin approval');
    console.log('✓ Test 2 Passed: Correction request created as PENDING_APPROVAL without mutating prayer_logs.');

    // ------------------------------------------------------------------------
    // Test 3: Reject duplicate pending request for same prayer & date
    // ------------------------------------------------------------------------
    console.log('3. Testing duplicate pending request protection...');
    const dupRes = await fetch(`${BASE_URL}/api/prayers/corrections/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        prayerName: 'dhuhr',
        prayerDate: pastDate,
        requestedStatus: 'late',
        reason: 'Duplicate submission attempt',
      }),
    });
    assert.equal(dupRes.status, 409, 'Duplicate request must return 409 Conflict');
    console.log('✓ Test 3 Passed: Duplicate pending request rejected with 409.');

    // ------------------------------------------------------------------------
    // Test 4: User can retrieve their submitted requests
    // ------------------------------------------------------------------------
    console.log('4. Testing user listing of submitted requests...');
    const myReqRes = await fetch(`${BASE_URL}/api/prayers/corrections/my`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const myReqData = await myReqRes.json();
    assert.equal(myReqRes.status, 200);
    assert.equal(myReqData.data.requests.length >= 1, true);
    assert.equal(myReqData.data.requests[0].id, requestId);
    console.log('✓ Test 4 Passed: User successfully retrieved submitted correction requests.');

    // ------------------------------------------------------------------------
    // Test 5: Admin can review and list requests
    // ------------------------------------------------------------------------
    console.log('5. Testing admin correction requests listing...');
    const adminListRes = await fetch(`${BASE_URL}/api/admin/prayers/correction-requests?status=PENDING_APPROVAL`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminListRes.json();
    assert.equal(adminListRes.status, 200);
    assert.equal(adminListData.data.summary.pending >= 1, true);
    console.log('✓ Test 5 Passed: Admin retrieved correction requests with pending summary.');

    // ------------------------------------------------------------------------
    // Test 6: Admin approves request in atomic transaction
    // ------------------------------------------------------------------------
    console.log('6. Testing admin approval transaction...');
    const approveRes = await fetch(`${BASE_URL}/api/admin/prayers/correction-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        adminNotes: 'Verified with masjid attendance',
      }),
    });
    const approveData = await approveRes.json();
    assert.equal(approveRes.status, 200, 'Approval must return 200 OK');
    assert.equal(approveData.success, true);
    assert.equal(approveData.data.updatedRequest.status, 'APPROVED');

    // Verify prayer_logs is now populated with is_admin_override = true
    const approvedLog = await prisma.prayerLog.findFirst({
      where: { userId: user.id, date: pastDate, prayerName: 'Dhuhr' },
    });
    assert.notEqual(approvedLog, null, 'Prayer log must now exist');
    assert.equal(approvedLog.status, 'on_time');
    assert.equal(approvedLog.isAdminOverride, true);

    // Verify audit record exists in admin_prayer_corrections
    const auditRecord = await prisma.adminPrayerCorrection.findFirst({
      where: { userId: user.id, date: pastDate, prayerName: 'Dhuhr' },
    });
    assert.notEqual(auditRecord, null, 'Audit trail entry must be recorded');
    assert.equal(auditRecord.adminId, admin.id);
    console.log('✓ Test 6 Passed: Admin approved request, prayer_logs updated with isAdminOverride=true, audit trail logged.');

    // ------------------------------------------------------------------------
    // Test 7: Admin rejects a request with mandatory reason
    // ------------------------------------------------------------------------
    console.log('7. Testing admin rejection workflow...');
    // Create another request for Asr
    const asrReqRes = await fetch(`${BASE_URL}/api/prayers/corrections/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        prayerName: 'asr',
        prayerDate: pastDate,
        requestedStatus: 'on_time',
        reason: 'Misremembered Asr timing',
      }),
    });
    const asrReqData = await asrReqRes.json();
    const asrReqId = asrReqData.data.id;

    // Reject without reason must fail
    const badRejectRes = await fetch(`${BASE_URL}/api/admin/prayers/correction-requests/${asrReqId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ rejectionReason: '' }),
    });
    assert.equal(badRejectRes.status, 400, 'Rejection without reason must return 400 Bad Request');

    // Reject with valid reason
    const validRejectRes = await fetch(`${BASE_URL}/api/admin/prayers/correction-requests/${asrReqId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ rejectionReason: 'Prayer time conflicts with existing records' }),
    });
    const validRejectData = await validRejectRes.json();
    assert.equal(validRejectRes.status, 200);
    assert.equal(validRejectData.data.status, 'REJECTED');
    assert.equal(validRejectData.data.rejectionReason, 'Prayer time conflicts with existing records');

    // Verify prayer_logs for Asr was NOT created
    const asrLog = await prisma.prayerLog.findFirst({
      where: { userId: user.id, date: pastDate, prayerName: 'Asr' },
    });
    assert.equal(asrLog, null, 'Rejected request must leave prayer_logs untouched');
    console.log('✓ Test 7 Passed: Admin rejection required reason and left prayer_logs untouched.');

    console.log('\n🎉 ALL 7 HISTORICAL CORRECTION INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Clean up test data
    await prisma.salahCorrectionRequest.deleteMany({
      where: { userId: { in: [user.id, admin.id] } },
    });
    await prisma.adminPrayerCorrection.deleteMany({
      where: { userId: { in: [user.id, admin.id] } },
    });
    await prisma.prayerLog.deleteMany({
      where: { userId: { in: [user.id, admin.id] } },
    });
    await prisma.notificationLog.deleteMany({
      where: { userId: { in: [user.id, admin.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user.id, admin.id] } },
    });
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
