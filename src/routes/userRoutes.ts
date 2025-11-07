import { Router } from 'express';
import * as climberController from '../controllers/climberController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * User Routes
 * PUT /api/user/settings - Update user profile settings
 * DELETE /api/user/delete - Delete user account
 */

router.put('/settings', authenticateToken, climberController.updateSettings);
router.delete('/delete', authenticateToken, climberController.deleteAccount);

export default router;
