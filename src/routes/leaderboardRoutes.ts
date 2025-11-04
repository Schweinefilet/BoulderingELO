import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';

const router = Router();

/**
 * Leaderboard Route
 * GET /api/leaderboard - Get leaderboard
 */

router.get('/', sessionController.getLeaderboard);

export default router;
