import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Session Routes
 * GET /api/sessions - Get sessions (with optional filters)
 * GET /api/sessions/:id - Get session by ID
 * POST /api/sessions - Add new session (authenticated)
 * DELETE /api/sessions/:id - Delete session (admin only)
 * GET /api/leaderboard - Get leaderboard (with optional date filters)
 */

router.get('/', sessionController.getSessions);
router.get('/:id', sessionController.getSessionById);
router.post('/', authenticateToken, sessionController.addSession);
router.delete('/:id', authenticateToken, requireAdmin, sessionController.deleteSession);

export default router;
