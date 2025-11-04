import { Router } from 'express';
import * as videoController from '../controllers/videoController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Video Routes
 * GET /api/videos - Get videos (optionally filtered by status)
 * POST /api/videos - Submit video for review (authenticated)
 * POST /api/videos/:id/vote - Vote on video (authenticated)
 * POST /api/videos/:id/approve - Approve video (admin only)
 * POST /api/videos/:id/reject - Reject video (admin only)
 */

router.get('/', videoController.getVideos);
router.post('/', authenticateToken, videoController.submitVideo);
router.post('/:id/vote', authenticateToken, videoController.voteOnVideo);
router.post('/:id/approve', authenticateToken, requireAdmin, videoController.approveVideo);
router.post('/:id/reject', authenticateToken, requireAdmin, videoController.rejectVideo);

export default router;
