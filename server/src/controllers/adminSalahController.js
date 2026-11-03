import { prisma } from '../db/prisma.js';
import { isValidDateKey } from '../utils/dateUtils.js';

const VALID_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const VALID_STATUSES = ['on_time', 'late', 'qada', 'missed', 'delete'];

/**
 * GET /api/admin/prayers
 * View & filter user Salah records with pagination
 */
export async function getAdminUserPrayers(req, res, next) {
  try {
    const {
      q,
      userId,
      startDate,
      endDate,
      prayerName,
      status,
      page = 1,
      limit = 50,
    } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};

    if (userId) {
      where.userId = userId;
    } else if (q) {
      // Find matching users first
      const matchedUsers = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      const userIds = matchedUsers.map((u) => u.id);
      where.userId = { in: userIds };
    }

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    if (prayerName && VALID_PRAYERS.includes(prayerName.toLowerCase())) {
      where.prayerName = prayerName.toLowerCase();
    }

    if (status && VALID_STATUSES.includes(status.toLowerCase())) {
      where.status = status.toLowerCase();
    }

    const [total, records] = await Promise.all([
      prisma.prayerLog.count({ where }),
      prisma.prayerLog.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { prayerName: 'asc' }],
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/prayers/correct
 * Administrative correction or retroactive entry for any past/current date
 * Enforces mandatory explanation reason and preserves audit history
 */
export async function correctUserPrayer(req, res, next) {
  try {
    const adminUser = req.user;
    const { userId, prayerName, date, status, reason } = req.body;

    if (!userId || !prayerName || !date || !status || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, prayerName, date, status, reason.',
      });
    }

    if (!isValidDateKey(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Expected YYYY-MM-DD.',
      });
    }

    const cleanPrayer = prayerName.toLowerCase().trim();
    if (!VALID_PRAYERS.includes(cleanPrayer)) {
      return res.status(400).json({
        success: false,
        error: `Invalid prayer name. Allowed: ${VALID_PRAYERS.join(', ')}`,
      });
    }

    const cleanStatus = status.toLowerCase().trim();
    if (!VALID_STATUSES.includes(cleanStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'A valid explanation reason (minimum 3 characters) is required for audit logs.',
      });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Target user not found.',
      });
    }

    // Check existing record
    const existingRecord = await prisma.prayerLog.findUnique({
      where: {
        userId_prayerName_date: {
          userId,
          prayerName: cleanPrayer,
          date,
        },
      },
    });

    const previousStatus = existingRecord ? existingRecord.status : null;

    let updatedPrayerLog = null;
    let correctionRecord = null;

    if (cleanStatus === 'delete') {
      if (existingRecord) {
        await prisma.prayerLog.delete({
          where: { id: existingRecord.id },
        });
      }

      correctionRecord = await prisma.adminPrayerCorrection.create({
        data: {
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          userId,
          prayerLogId: existingRecord?.id || null,
          prayerName: cleanPrayer,
          date,
          previousStatus,
          newStatus: 'delete',
          reason: reason.trim(),
        },
      });
    } else {
      // Upsert record
      updatedPrayerLog = await prisma.prayerLog.upsert({
        where: {
          userId_prayerName_date: {
            userId,
            prayerName: cleanPrayer,
            date,
          },
        },
        create: {
          userId,
          prayerName: cleanPrayer,
          date,
          status: cleanStatus,
          notes: `[Admin Correction by ${adminUser.email}]: ${reason.trim()}`,
          loggedAt: new Date(),
          isAdminOverride: true,
        },
        update: {
          status: cleanStatus,
          notes: `[Admin Correction by ${adminUser.email}]: ${reason.trim()}`,
          loggedAt: new Date(),
          isAdminOverride: true,
        },
      });

      correctionRecord = await prisma.adminPrayerCorrection.create({
        data: {
          adminId: adminUser.id,
          adminEmail: adminUser.email,
          userId,
          prayerLogId: updatedPrayerLog.id,
          prayerName: cleanPrayer,
          date,
          previousStatus,
          newStatus: cleanStatus,
          reason: reason.trim(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Prayer ${cleanPrayer} on ${date} for ${targetUser.email} updated to ${cleanStatus}.`,
      data: {
        prayerLog: updatedPrayerLog,
        correction: correctionRecord,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/prayers/corrections
 * View audit log history of administrative modifications
 */
export async function getAdminPrayerCorrections(req, res, next) {
  try {
    const { userId, prayerName, date, page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (userId) where.userId = userId;
    if (date) where.date = date;
    if (prayerName) where.prayerName = prayerName.toLowerCase();

    const [total, corrections] = await Promise.all([
      prisma.adminPrayerCorrection.count({ where }),
      prisma.adminPrayerCorrection.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: corrections,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/analytics/salah
 * Aggregated Salah completion metrics, missed/qada ratios, and notification health
 */
export async function getAdminSalahAnalytics(req, res, next) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [
      totalUsers,
      totalPrayersLogged,
      todayLoggedCount,
      allTimeStatusCounts,
      todayStatusCounts,
      prayersByPrayerName,
      totalNotificationLogs,
      pushNotificationsDelivered,
      recentCorrections,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.prayerLog.count(),
      prisma.prayerLog.count({ where: { date: todayStr } }),
      prisma.prayerLog.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.prayerLog.groupBy({
        by: ['status'],
        where: { date: todayStr },
        _count: { _all: true },
      }),
      prisma.prayerLog.groupBy({
        by: ['prayerName'],
        _count: { _all: true },
      }),
      prisma.notificationLog.count(),
      prisma.notificationLog.count({ where: { pushSent: true } }),
      prisma.adminPrayerCorrection.findMany({
        take: 8,
        include: {
          user: { select: { name: true, email: true } },
          admin: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const statusTotals = {
      on_time: 0,
      late: 0,
      qada: 0,
      missed: 0,
    };
    allTimeStatusCounts.forEach((s) => {
      if (statusTotals[s.status] !== undefined) {
        statusTotals[s.status] = s._count._all;
      }
    });

    const todayTotals = {
      on_time: 0,
      late: 0,
      qada: 0,
      missed: 0,
    };
    todayStatusCounts.forEach((s) => {
      if (todayTotals[s.status] !== undefined) {
        todayTotals[s.status] = s._count._all;
      }
    });

    const totalCompleted = statusTotals.on_time + statusTotals.late + statusTotals.qada;
    const completionRatePercent =
      totalPrayersLogged > 0
        ? Math.round((totalCompleted / totalPrayersLogged) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalPrayersLogged,
          todayLoggedCount,
          totalCompleted,
          completionRatePercent,
        },
        statusTotals,
        todayTotals,
        prayerDistribution: prayersByPrayerName.map((p) => ({
          prayerName: p.prayerName,
          count: p._count._all,
        })),
        notifications: {
          totalDelivered: totalNotificationLogs,
          pushDelivered: pushNotificationsDelivered,
          pushDeliveryRatePercent:
            totalNotificationLogs > 0
              ? Math.round((pushNotificationsDelivered / totalNotificationLogs) * 100)
              : 0,
        },
        recentCorrections,
      },
    });
  } catch (err) {
    next(err);
  }
}
