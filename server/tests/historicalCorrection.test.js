import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { db } from '../src/db/connection.js';
import { cleanupExpiredCorrectionNotifications } from '../src/services/notificationScheduler.js';

// Import server to ensure HTTP listener is running
import '../src/server.js';

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

    // ------------------------------------------------------------------------
    // Test 8: User cannot delete pending correction request
    // ------------------------------------------------------------------------
    console.log('8. Testing that pending requests cannot be deleted by user...');
    // Create a pending Maghrib request
    const maghribReqRes = await fetch(`${BASE_URL}/api/prayers/corrections/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        prayerName: 'maghrib',
        prayerDate: pastDate,
        requestedStatus: 'on_time',
        reason: 'Awaiting admin review test',
      }),
    });
    const maghribData = await maghribReqRes.json();
    const maghribId = maghribData.data.id;

    // Attempt to delete pending request
    const deletePendingRes = await fetch(`${BASE_URL}/api/prayers/corrections/${maghribId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.equal(deletePendingRes.status, 400, 'Pending requests must return 400 on delete attempt');
    const deletePendingData = await deletePendingRes.json();
    assert.equal(deletePendingData.success, false);
    console.log('✓ Test 8 Passed: Pending request cannot be deleted while awaiting review.');

    // ------------------------------------------------------------------------
    // Test 9: User manual deletion of approved/rejected request message
    // ------------------------------------------------------------------------
    console.log('9. Testing user manual deletion of approved request notification message...');
    // Delete the approved Dhuhr request (requestId from Test 2 & 6)
    const deleteApprovedRes = await fetch(`${BASE_URL}/api/prayers/corrections/${requestId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const deleteApprovedData = await deleteApprovedRes.json();
    assert.equal(deleteApprovedRes.status, 200, 'Deleting approved message must return 200 OK');
    assert.equal(deleteApprovedData.success, true);

    // Verify userDismissedAt is set in salah_correction_requests
    const dismissedRequest = await prisma.salahCorrectionRequest.findUnique({
      where: { id: requestId },
    });
    assert.notEqual(dismissedRequest, null, 'Database record must remain intact');
    assert.notEqual(dismissedRequest.userDismissedAt, null, 'userDismissedAt must be populated');

    // Verify prayer_logs remains INTACT
    const preservedLog = await prisma.prayerLog.findFirst({
      where: { userId: user.id, date: pastDate, prayerName: 'Dhuhr' },
    });
    assert.notEqual(preservedLog, null, 'Prayer log record must NOT be deleted');
    assert.equal(preservedLog.status, 'on_time');

    // Verify admin audit record remains INTACT
    const preservedAudit = await prisma.adminPrayerCorrection.findFirst({
      where: { userId: user.id, date: pastDate, prayerName: 'Dhuhr' },
    });
    assert.notEqual(preservedAudit, null, 'Admin audit history must NOT be deleted');

    // Verify getMyCorrectionRequests now omits the deleted message
    const afterDeleteMyReqRes = await fetch(`${BASE_URL}/api/prayers/corrections/my`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const afterDeleteData = await afterDeleteMyReqRes.json();
    const matchingItem = afterDeleteData.data.requests.find((r) => r.id === requestId);
    assert.equal(matchingItem, undefined, 'Dismissed request must not appear in user list');
    console.log('✓ Test 9 Passed: Manual delete soft-deleted user message while preserving prayer_logs and admin audit trail.');

    // ------------------------------------------------------------------------
    // Test 10: Automatic 5-hour cutoff for resolved requests in getMyCorrectionRequests
    // ------------------------------------------------------------------------
    console.log('10. Testing automatic 5-hour cutoff for resolved requests...');
    // Create an Isha request and simulate it being approved 6 hours ago
    const ishaRequest = await prisma.salahCorrectionRequest.create({
      data: {
        userId: user.id,
        prayerName: 'Isha',
        prayerDate: pastDate,
        requestedStatus: 'on_time',
        status: 'APPROVED',
        reason: '5-hour cutoff test',
        previousStatus: 'none',
        reviewedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        reviewedBy: admin.id,
        userDismissedAt: null,
      },
    });

    const cutoffCheckRes = await fetch(`${BASE_URL}/api/prayers/corrections/my`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const cutoffCheckData = await cutoffCheckRes.json();
    const oldResolvedItem = cutoffCheckData.data.requests.find((r) => r.id === ishaRequest.id);
    assert.equal(oldResolvedItem, undefined, 'Approved request older than 5 hours must be excluded from user list');

    // Confirm that the pending Maghrib request is STILL included despite any age
    const pendingStillIncluded = cutoffCheckData.data.requests.find((r) => r.id === maghribId);
    assert.notEqual(pendingStillIncluded, undefined, 'Pending request must NEVER be excluded');
    console.log('✓ Test 10 Passed: Resolved requests older than 5 hours are automatically hidden; pending requests remain visible.');

    // ------------------------------------------------------------------------
    // Test 11: Background cleanup scheduler job
    // ------------------------------------------------------------------------
    console.log('11. Testing background scheduler cleanup job...');
    // Create notification_log for prayer correction older than 5 hours
    const oldDeliveredAt = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    await db.prepare(`
      INSERT INTO notification_logs (user_id, prayer_name, date, reminder_type, category, title, body, delivered_at)
      VALUES (?, 'Isha', ?, 'ADMIN_CORRECTION_EXPIRED_TEST', 'prayer_correction', 'Approved', 'Your correction was approved', ?)
    `).run(user.id, pastDate, oldDeliveredAt);

    // Run the scheduler cleanup
    await cleanupExpiredCorrectionNotifications();

    // Verify the old notification log was deleted
    const oldNotifCheck = await db.prepare(`
      SELECT * FROM notification_logs
      WHERE user_id = ? AND reminder_type = 'ADMIN_CORRECTION_EXPIRED_TEST'
    `).all(user.id);
    assert.equal(oldNotifCheck.length, 0, 'Notification logs older than 5 hours must be purged');

    // Verify recent notification logs (< 5 hours old) are safely preserved
    const recentNotifCheck = await db.prepare(`
      SELECT * FROM notification_logs
      WHERE user_id = ? AND category = 'prayer_correction'
    `).all(user.id);
    assert.equal(recentNotifCheck.length >= 1, true, 'Recent notifications under 5 hours must be preserved');

    // Verify ishaRequest received user_dismissed_at
    const updatedIshaRequest = await prisma.salahCorrectionRequest.findUnique({
      where: { id: ishaRequest.id },
    });
    assert.notEqual(updatedIshaRequest.userDismissedAt, null, 'Old approved request must have user_dismissed_at set by scheduler');

    // Verify maghrib pending request has userDismissedAt = null (never modified)
    const intactMaghribRequest = await prisma.salahCorrectionRequest.findUnique({
      where: { id: maghribId },
    });
    assert.equal(intactMaghribRequest.userDismissedAt, null, 'Pending request must remain untouched');
    console.log('✓ Test 11 Passed: Background scheduler purges old notifications and marks resolved requests without touching pending ones.');

    console.log('\n🎉 ALL 11 HISTORICAL CORRECTION & CLEANUP INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Clean up test data safely
    try {
      await prisma.salahCorrectionRequest.deleteMany({
        where: { userId: { in: [user.id, admin.id] } },
      });
    } catch {}
    try {
      await prisma.adminPrayerCorrection.deleteMany({
        where: { userId: { in: [user.id, admin.id] } },
      });
    } catch {}
    try {
      await prisma.prayerLog.deleteMany({
        where: { userId: { in: [user.id, admin.id] } },
      });
    } catch {}
    try {
      await prisma.notificationLog.deleteMany({
        where: { userId: { in: [user.id, admin.id] } },
      });
    } catch {}
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [user.id, admin.id] } },
      });
    } catch {}
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
