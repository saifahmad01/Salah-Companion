import { getUserPrayerStats } from '../services/userService.js';
import { db } from '../db/connection.js';

/**
 * Controller to fetch 7-day completion stats and active streak
 * GET /api/user/:id/stats
 */
export async function getUserStatsHandler(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing user id parameter in path /api/user/:id/stats.',
      });
    }

    if (req.user && req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You do not have permission to access another user\'s statistics.',
      });
    }

    const stats = await getUserPrayerStats(id);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Optional convenience controller: Create or update a user profile
 * POST /api/users
 * Body: { id, name, email }
 */
export async function upsertUserHandler(req, res, next) {
  try {
    const { id, name, email } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Field "id" is required for user account.',
      });
    }

    const userName = name || `User-${id.slice(0, 6)}`;

    const upsertStmt = db.prepare(`
      INSERT INTO users (id, name, email, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = coalesce(excluded.name, users.name),
        email = coalesce(excluded.email, users.email),
        updated_at = datetime('now')
    `);

    await upsertStmt.run(id, userName, email || null);
    const user = await db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Optional convenience controller: List all active users
 * GET /api/users
 */
export async function listUsersHandler(req, res, next) {
  try {
    const users = await db.prepare(`SELECT * FROM users ORDER BY created_at DESC`).all();
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
}
