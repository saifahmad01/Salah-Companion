import { prisma } from '../db/prisma.js';
import {
  isValidDateKey,
  getLocalDateKey,
  resolveUserTimezone,
} from '../utils/dateUtils.js';

const VALID_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const VALID_REQUESTED_STATUSES = ['on_time', 'late', 'qada', 'missed'];

function normalizePrayer(name) {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  if (lower === 'juma' || lower === 'jumuah' || lower === "jumu'ah" || lower === 'jummah') {
    return 'dhuhr';
  }
  return lower;
}

/**
 * POST /api/prayers/corrections/request
 * Allows an authenticated user to submit a correction request for a PAST prayer record.
 * The historical prayer record itself is NOT modified until an admin approves the request.
 */
export async function submitCorrectionRequest(req, res, next) {
  try {
    const userId = req.user.id;
    const { prayerName, prayerDate, requestedStatus, reason, notes } = req.body;

    if (!prayerName || !prayerDate || !requestedStatus || !reason) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_REQUIRED_FIELDS',
        error: 'Prayer name, date, requested status, and a valid reason are required.',
      });
    }

    if (!isValidDateKey(prayerDate)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DATE_FORMAT',
        error: 'Date must be formatted as YYYY-MM-DD.',
      });
    }

    const normalizedPrayer = normalizePrayer(prayerName);
    if (!VALID_PRAYERS.includes(normalizedPrayer)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PRAYER_NAME',
        error: `Prayer name must be one of: ${VALID_PRAYERS.join(', ')}.`,
      });
    }

    const normStatus = requestedStatus.toLowerCase().trim();
    if (!VALID_REQUESTED_STATUSES.includes(normStatus)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REQUESTED_STATUS',
        error: `Requested status must be one of: ${VALID_REQUESTED_STATUSES.join(', ')}.`,
      });
    }

    const trimmedReason = String(reason).trim();
    if (trimmedReason.length < 3) {
      return res.status(400).json({
        success: false,
        code: 'REASON_TOO_SHORT',
        error: 'Please provide a clear reason for the historical correction (minimum 3 characters).',
      });
    }

    // Resolve user's timezone to ensure the target date is strictly in the PAST
    const userTimezone = await resolveUserTimezone(userId, req, prisma);
    const todayStr = getLocalDateKey(new Date(), userTimezone);

    if (prayerDate >= todayStr) {
      return res.status(400).json({
        success: false,
        code: 'NOT_A_PAST_DATE',
        error: `Correction requests are strictly for historical past records. For today (${todayStr}) or future dates, track directly or wait for the prayer window.`,
      });
    }

    // Check if an existing request is already pending for this user, date, and prayer
    const existingPending = await prisma.salahCorrectionRequest.findFirst({
      where: {
        userId,
        prayerName: normalizedPrayer,
        prayerDate,
        status: 'PENDING_APPROVAL',
      },
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        code: 'CORRECTION_REQUEST_ALREADY_PENDING',
        error: `A correction request for ${normalizedPrayer.toUpperCase()} on ${prayerDate} is already pending administrator review.`,
        data: existingPending,
      });
    }

    // Check current recorded status in prayer_logs
    const existingLog = await prisma.prayerLog.findFirst({
      where: {
        userId,
        prayerName: { in: [normalizedPrayer, normalizedPrayer.charAt(0).toUpperCase() + normalizedPrayer.slice(1)] },
        date: prayerDate,
      },
    });

    const previousStatus = existingLog ? existingLog.status : 'none';

    // Create the correction request record (leaves prayer_logs untouched!)
    const createdRequest = await prisma.salahCorrectionRequest.create({
      data: {
        userId,
        prayerLogId: existingLog?.id || null,
        prayerName: normalizedPrayer,
        prayerDate,
        previousStatus,
        requestedStatus: normStatus,
        reason: trimmedReason,
        notes: notes ? String(notes).trim() : null,
        status: 'PENDING_APPROVAL',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Correction request submitted successfully. It will take effect once reviewed and approved by an administrator.',
      data: createdRequest,
    });
  } catch (error) {
    console.error('[SalahCorrection] submitCorrectionRequest error:', error);
    next(error);
  }
}

/**
 * GET /api/prayers/corrections/my
 * Returns the current authenticated user's submitted correction requests.
 */
export async function getMyCorrectionRequests(req, res, next) {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const where = { userId };
    if (status && status !== 'ALL') {
      where.status = String(status).toUpperCase();
    }

    const [total, requests] = await Promise.all([
      prisma.salahCorrectionRequest.count({ where }),
      prisma.salahCorrectionRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / take) || 1,
      },
    });
  } catch (error) {
    console.error('[SalahCorrection] getMyCorrectionRequests error:', error);
    next(error);
  }
}

/**
 * GET /api/admin/prayers/correction-requests
 * Admin endpoint to list, search, and filter correction requests across all users.
 */
export async function getAdminCorrectionRequests(req, res, next) {
  try {
    const {
      status = 'PENDING_APPROVAL',
      q,
      prayerDate,
      prayerName,
      page = 1,
      limit = 50,
    } = req.query;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {};

    if (status && status !== 'ALL') {
      where.status = String(status).toUpperCase();
    }

    if (prayerDate && isValidDateKey(prayerDate)) {
      where.prayerDate = prayerDate;
    }

    if (prayerName && VALID_PRAYERS.includes(prayerName.toLowerCase())) {
      where.prayerName = prayerName.toLowerCase();
    }

    if (q) {
      where.user = {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const [total, requests, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.salahCorrectionRequest.count({ where }),
      prisma.salahCorrectionRequest.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.salahCorrectionRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.salahCorrectionRequest.count({ where: { status: 'APPROVED' } }),
      prisma.salahCorrectionRequest.count({ where: { status: 'REJECTED' } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / take) || 1,
        summary: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          totalAll: pendingCount + approvedCount + rejectedCount,
        },
      },
    });
  } catch (error) {
    console.error('[SalahCorrection] getAdminCorrectionRequests error:', error);
    next(error);
  }
}

/**
 * POST /api/admin/prayers/correction-requests/:id/approve
 * Admin approves a pending correction request.
 * Executes atomically in a transaction:
 * 1. Updates SalahCorrectionRequest to APPROVED
 * 2. Updates or creates the historical PrayerLog record
 * 3. Records an audit entry in AdminPrayerCorrection
 * 4. Logs a notification for the user
 */
export async function approveCorrectionRequest(req, res, next) {
  try {
    const adminId = req.user.id;
    const adminEmail = req.user.email;
    const { id } = req.params;
    const { adminNotes } = req.body;

    const request = await prisma.salahCorrectionRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        code: 'REQUEST_NOT_FOUND',
        error: 'Correction request not found.',
      });
    }

    if (request.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_RESOLVED',
        error: `Correction request has already been ${request.status.toLowerCase()}.`,
        data: request,
      });
    }

    const normalizedPrayer = request.prayerName.toLowerCase();
    const capitalizedPrayer = normalizedPrayer.charAt(0).toUpperCase() + normalizedPrayer.slice(1);

    // Atomic transaction for database consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark request as APPROVED
      const updatedRequest = await tx.salahCorrectionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          notes: adminNotes ? `${request.notes ? request.notes + '\n' : ''}[Admin Note]: ${adminNotes}` : request.notes,
        },
      });

      // 2. Upsert PrayerLog record
      let prayerLog = await tx.prayerLog.findFirst({
        where: {
          userId: request.userId,
          prayerName: { in: [normalizedPrayer, capitalizedPrayer] },
          date: request.prayerDate,
        },
      });

      if (prayerLog) {
        prayerLog = await tx.prayerLog.update({
          where: { id: prayerLog.id },
          data: {
            status: request.requestedStatus,
            isAdminOverride: true,
            notes: `Admin-approved correction: ${request.reason}`,
            updatedAt: new Date(),
          },
        });
      } else {
        prayerLog = await tx.prayerLog.create({
          data: {
            userId: request.userId,
            prayerName: capitalizedPrayer,
            date: request.prayerDate,
            status: request.requestedStatus,
            isAdminOverride: true,
            notes: `Admin-approved correction: ${request.reason}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Link prayerLogId if not already set
      if (!updatedRequest.prayerLogId) {
        await tx.salahCorrectionRequest.update({
          where: { id },
          data: { prayerLogId: prayerLog.id },
        });
      }

      // 3. Create audit entry in AdminPrayerCorrection
      await tx.adminPrayerCorrection.create({
        data: {
          adminId,
          adminEmail,
          userId: request.userId,
          prayerLogId: prayerLog.id,
          prayerName: capitalizedPrayer,
          date: request.prayerDate,
          previousStatus: request.previousStatus,
          newStatus: request.requestedStatus,
          reason: `Approved Correction Request [${id}]: ${request.reason}${adminNotes ? ` | Note: ${adminNotes}` : ''}`,
          createdAt: new Date(),
        },
      });

      // 4. Create in-app notification log for user
      try {
        await tx.notificationLog.create({
          data: {
            userId: request.userId,
            prayerName: capitalizedPrayer,
            date: request.prayerDate,
            reminderType: 'ADMIN_CORRECTION_APPROVED',
            title: 'Salah Correction Approved',
            body: `Your request to update ${capitalizedPrayer} on ${request.prayerDate} to ${request.requestedStatus.toUpperCase().replace('_', ' ')} has been approved.`,
            isRead: false,
            pushSent: false,
            category: 'prayer_correction',
            deepLink: '/app?tab=my_salah',
            deliveredAt: new Date(),
          },
        });
      } catch (notifErr) {
        // Non-blocking if unique constraint hit
        console.warn('[SalahCorrection] Non-fatal notificationLog error:', notifErr.message);
      }

      return { updatedRequest, prayerLog };
    });

    return res.status(200).json({
      success: true,
      message: `Correction request approved. ${capitalizedPrayer} on ${request.prayerDate} updated to ${request.requestedStatus.toUpperCase()}.`,
      data: result,
    });
  } catch (error) {
    console.error('[SalahCorrection] approveCorrectionRequest error:', error);
    next(error);
  }
}

/**
 * POST /api/admin/prayers/correction-requests/:id/reject
 * Admin rejects a pending correction request.
 * Requires a mandatory rejection reason.
 * Crucially leaves prayer_logs completely unchanged.
 */
export async function rejectCorrectionRequest(req, res, next) {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || String(rejectionReason).trim().length < 3) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_REJECTION_REASON',
        error: 'A clear rejection reason (at least 3 characters) is required when rejecting a correction request.',
      });
    }

    const request = await prisma.salahCorrectionRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        code: 'REQUEST_NOT_FOUND',
        error: 'Correction request not found.',
      });
    }

    if (request.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_RESOLVED',
        error: `Correction request has already been ${request.status.toLowerCase()}.`,
        data: request,
      });
    }

    const trimmedReason = String(rejectionReason).trim();
    const capitalizedPrayer = request.prayerName.charAt(0).toUpperCase() + request.prayerName.slice(1);

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const rejected = await tx.salahCorrectionRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason: trimmedReason,
        },
      });

      // Dispatch user notification
      try {
        await tx.notificationLog.create({
          data: {
            userId: request.userId,
            prayerName: capitalizedPrayer,
            date: request.prayerDate,
            reminderType: 'ADMIN_CORRECTION_REJECTED',
            title: 'Salah Correction Rejected',
            body: `Your correction request for ${capitalizedPrayer} on ${request.prayerDate} was not approved: "${trimmedReason}"`,
            isRead: false,
            pushSent: false,
            category: 'prayer_correction',
            deepLink: '/app?tab=my_salah',
            deliveredAt: new Date(),
          },
        });
      } catch (notifErr) {
        console.warn('[SalahCorrection] Non-fatal notificationLog error:', notifErr.message);
      }

      return rejected;
    });

    return res.status(200).json({
      success: true,
      message: 'Correction request has been rejected. Historical prayer logs remain unchanged.',
      data: updatedRequest,
    });
  } catch (error) {
    console.error('[SalahCorrection] rejectCorrectionRequest error:', error);
    next(error);
  }
}
