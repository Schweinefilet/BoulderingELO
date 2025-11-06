import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Admin Routes
 * POST /api/admin/wipe-all-data - Wipe all data (public for emergency access)
 * POST /api/admin/promote-user - Promote user to admin (public for initial setup)
 * POST /api/admin/fix-username - Fix username case (public for migration)
 * POST /api/admin/create-account - Create account (public for setup)
 * POST /api/admin/reset-and-seed - Reset DB and seed with sample data (admin only)
 * POST /api/admin/merge-duplicates - Merge duplicate sessions (admin only)
 * PUT /api/admin/climber/:climberId - Update climber profile (admin only)
 * POST /api/admin/expired-sections - Add section to expired list (admin only)
 * GET /api/admin/expired-sections - Get list of expired sections
 * DELETE /api/admin/expired-sections - Remove section from expired list (admin only)
 */

// Public admin endpoints (for emergency access / initial setup)
router.post('/wipe-all-data', adminController.wipeAllData);
router.post('/promote-user', adminController.promoteUser);
router.post('/fix-username', adminController.fixUsername);
router.post('/create-account', adminController.createAccount);

// Protected admin endpoints
router.post('/reset-and-seed', authenticateToken, requireAdmin, adminController.resetAndSeed);
router.post('/merge-duplicates', authenticateToken, requireAdmin, adminController.mergeDuplicateSessions);
router.put('/climber/:climberId', authenticateToken, requireAdmin, adminController.updateClimberProfile);

// Expired sections management
router.post('/expired-sections', authenticateToken, requireAdmin, adminController.addExpiredSection);
router.get('/expired-sections', adminController.getExpiredSections);
router.delete('/expired-sections', authenticateToken, requireAdmin, adminController.removeExpiredSection);

export default router;
