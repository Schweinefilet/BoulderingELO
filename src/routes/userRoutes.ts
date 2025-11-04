import { Router } from 'express';
import * as climberController from '../controllers/climberController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * User Routes
 * PUT /api/user/settings - Update user profile settings
 */

router.put('/settings', authenticateToken, climberController.updateSettings);

export default router;
