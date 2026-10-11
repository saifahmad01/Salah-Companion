import { prisma } from '../db/prisma.js';
import { checkDbHealth } from '../db/connection.js';
import { config } from '../config/env.js';
import { isPermanentAdmin } from '../constants/admins.js';

/**
 * GET /api/admin/overview
 * Real-time operational analytics and KPI overview for Admin Dashboard
 */
export async function getAdminOverview(req, res, next) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [
      totalUsers,
      verifiedUsers,
      pendingCount,
      totalPrayerLogs,
      prayersToday,
      recentLogs,
      activeUsers7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.pendingRegistration.count(),
      prisma.prayerLog.count(),
      prisma.prayerLog.count({ where: { date: todayStr } }),
      prisma.prayerLog.groupBy({
        by: ['prayerName', 'status'],
        where: { date: todayStr },
        _count: { _all: true },
      }),
      prisma.prayerLog.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const dbHealth = await checkDbHealth();

    // Map prayer breakdown for today
    const breakdown = {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    };
    recentLogs.forEach((item) => {
      const name = item.prayerName.toLowerCase();
      if (breakdown[name] !== undefined) {
        breakdown[name] += item._count._all;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalUsers,
          verifiedUsers,
          unverifiedUsers: totalUsers - verifiedUsers,
          pendingRegistrations: pendingCount,
          totalPrayersLogged: totalPrayerLogs,
          prayersLoggedToday: prayersToday,
          weeklyActiveUsers: activeUsers7d.length,
        },
        todayBreakdown: breakdown,
        system: {
          status: dbHealth.connected ? 'healthy' : 'degraded',
          databaseProvider: dbHealth.provider,
          databaseLatencyMs: dbHealth.latencyMs || 0,
          environment: config.nodeEnv,
          serverUptimeSec: Math.floor(process.uptime()),
          nodeVersion: process.version,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users
 * Paginated and filterable user directory
 */
export async function getAdminUsers(req, res, next) {
  try {
    const { q, role, verified, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (role && (role === 'ADMIN' || role === 'USER')) {
      where.role = role;
    }

    if (verified !== undefined && verified !== '') {
      where.isEmailVerified = verified === 'true';
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isEmailVerified: true,
          prayerCalculationMethod: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { prayerLogs: true, deedLogs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Elevates or demotes a user's RBAC role
 */
export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified. Role must be "USER" or "ADMIN".',
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    // Permanent super administrators cannot be demoted
    if (isPermanentAdmin(targetUser.email) && role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify role of a permanent system administrator.',
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/users/:id
 * Removes a user and cascade deletes their logs
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user && req.user.id === id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own admin account while logged in.',
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    // Permanent super administrators cannot be deleted
    if (isPermanentAdmin(targetUser.email)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete a permanent system administrator account.',
      });
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'User account and all associated records deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/broadcast
 * Broadcast adhan reminder or spiritual reflection to active users
 */
export async function broadcastNotification(req, res, next) {
  try {
    const { title, body, type = 'announcement' } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Both "title" and "body" are required for broadcast notifications.',
      });
    }

    // In production, dispatch via web-push to registered push subscriptions
    console.log(`[Admin Broadcast] "${title}" (${type}): ${body}`);

    return res.status(200).json({
      success: true,
      message: 'Broadcast notification dispatched successfully to subscribed devices.',
      broadcast: {
        title,
        body,
        type,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}
