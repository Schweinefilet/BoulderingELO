import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * Auth Routes
 * POST /api/auth/login - User login
 * POST /api/auth/register - User registration
 * POST /api/auth/google - Google OAuth login/registration
 * POST /api/auth/link-google - Link Google account to current user (authenticated)
 * POST /api/auth/change-password - Change password (authenticated)
 */

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/google', authController.googleAuth);
router.post('/link-google', authenticateToken, authController.linkGoogleAccount);
router.post('/change-password', authenticateToken, authController.changePassword);

export default router;
