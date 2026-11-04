import { Router } from 'express';
import {
  getAdminOverview,
  getAdminUsers,
  updateUserRole,
  deleteUser,
  broadcastNotification,
} from '../controllers/adminController.js';
import {
  getAppReleaseInfo,
  updateAppReleaseInfo,
} from '../controllers/appController.js';
import {
  getAdminQuranResources,
  upsertQuranResource,
  toggleResourceStatus,
} from '../controllers/quranResourceController.js';
import {
  getAdminUserPrayers,
  correctUserPrayer,
  getAdminPrayerCorrections,
  getAdminSalahAnalytics,
} from '../controllers/adminSalahController.js';
import {
  getAdminCorrectionRequests,
  approveCorrectionRequest,
  rejectCorrectionRequest,
} from '../controllers/salahCorrectionController.js';
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
// Admin Salah Management & Corrections Endpoints
// ============================================================================
adminRouter.get('/prayers', getAdminUserPrayers);
adminRouter.post('/prayers/correct', correctUserPrayer);
adminRouter.get('/prayers/corrections', getAdminPrayerCorrections);
adminRouter.get('/analytics/salah', getAdminSalahAnalytics);

// ============================================================================
// Admin Salah Historical Correction Requests Review
// ============================================================================
adminRouter.get('/prayers/correction-requests', getAdminCorrectionRequests);
adminRouter.post('/prayers/correction-requests/:id/approve', approveCorrectionRequest);
adminRouter.post('/prayers/correction-requests/:id/reject', rejectCorrectionRequest);

// ============================================================================
// Quran PDF Resource Admin Endpoints
// ============================================================================
adminRouter.get('/quran/resources', getAdminQuranResources);
adminRouter.post('/quran/resources', upsertQuranResource);
adminRouter.patch('/quran/resources/:id/status', toggleResourceStatus);

// ============================================================================
// Application Version & Release Management
// ============================================================================
adminRouter.get('/app/version', getAppReleaseInfo);
adminRouter.post('/app/version', updateAppReleaseInfo);
