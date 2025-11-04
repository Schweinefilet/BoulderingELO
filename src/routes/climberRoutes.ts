import { Router } from 'express';
import * as climberController from '../controllers/climberController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Climber Routes
 * GET /api/climbers - Get all climbers
 * POST /api/climbers - Add new climber (admin only)
 * DELETE /api/climbers/:id - Delete climber (admin only)
 * PUT /api/user/settings - Update user settings (authenticated)
 */

router.get('/', climberController.getAllClimbers);
router.post('/', authenticateToken, requireAdmin, climberController.addClimber);
router.delete('/:id', authenticateToken, requireAdmin, climberController.deleteClimber);

export default router;
