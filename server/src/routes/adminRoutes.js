import { Router } from 'express';
import {
  getAdminOverview,
  getAdminUsers,
  updateUserRole,
  deleteUser,
  broadcastNotification,
} from '../controllers/adminController.js';
import {
  getAdminQuranResources,
  upsertQuranResource,
  toggleResourceStatus,
} from '../controllers/quranResourceController.js';
import { protectRoute, restrictTo } from '../middlewares/authMiddleware.js';

export const adminRouter = Router();

// Protect all admin endpoints with RBAC (requires valid session + ADMIN role)
adminRouter.use(protectRoute, restrictTo('ADMIN'));

// GET /api/admin/overview
adminRouter.get('/overview', getAdminOverview);

// GET /api/admin/users
adminRouter.get('/users', getAdminUsers);

// PATCH /api/admin/users/:id/role
adminRouter.patch('/users/:id/role', updateUserRole);

// DELETE /api/admin/users/:id
adminRouter.delete('/users/:id', deleteUser);

// POST /api/admin/broadcast
adminRouter.post('/broadcast', broadcastNotification);

// ============================================================================
// Quran PDF Resource Admin Endpoints
// ============================================================================
adminRouter.get('/quran/resources', getAdminQuranResources);
adminRouter.post('/quran/resources', upsertQuranResource);
adminRouter.patch('/quran/resources/:id/status', toggleResourceStatus);

