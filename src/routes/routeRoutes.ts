import { Router } from 'express';
import * as routeController from '../controllers/routeController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Route Routes
 * GET /api/routes - Get all routes (with optional filters)
 * GET /api/routes/:id - Get route by ID
 * POST /api/routes - Create new route (admin only)
 * PUT /api/routes/:id - Update route (admin only)
 * DELETE /api/routes/:id - Archive route (admin only)
 * POST /api/routes/bulk-import - Bulk import from wallTotals (admin only)
 */

router.get('/', routeController.getRoutes);
router.get('/:id', routeController.getRoute);
router.post('/', authenticateToken, requireAdmin, routeController.createRoute);
router.put('/:id', authenticateToken, requireAdmin, routeController.updateRoute);
router.delete('/:id', authenticateToken, requireAdmin, routeController.deleteRoute);
router.post('/bulk-import', authenticateToken, requireAdmin, routeController.bulkImportRoutes);
router.delete('/all/delete-all', authenticateToken, requireAdmin, routeController.deleteAllRoutes);

export default router;
