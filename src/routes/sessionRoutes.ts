import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';
import * as routeController from '../controllers/routeController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Session Routes
 * GET /api/sessions - Get sessions (with optional filters)
 * GET /api/sessions/:id - Get session by ID
 * POST /api/sessions - Add new session (authenticated)
 * POST /api/sessions/routes - Create route-based session (authenticated)
 * GET /api/sessions/:id/routes - Get routes for a session
 * DELETE /api/sessions/:id - Delete session (admin only)
 */

router.get('/', sessionController.getSessions);
router.get('/:id', sessionController.getSessionById);
router.post('/', authenticateToken, sessionController.addSession);
router.post('/routes', authenticateToken, routeController.createRouteSession);
router.get('/:sessionId/routes', routeController.getSessionRoutes);
router.delete('/:id', authenticateToken, requireAdmin, sessionController.deleteSession);

export default router;
