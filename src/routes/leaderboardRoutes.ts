import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * Leaderboard Route
 * GET /api/leaderboard - Get leaderboard
 */

router.get('/', optionalAuth, sessionController.getLeaderboard);

export default router;
