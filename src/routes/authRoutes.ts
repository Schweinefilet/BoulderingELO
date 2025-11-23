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
 * POST /api/auth/forgot-password - Send password reset link (if applicable)
 * GET /api/auth/reset-password/validate - Validate reset token
 * POST /api/auth/reset-password - Complete password reset
 */

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/google', authController.googleAuth);
router.get('/google-config', authController.getGoogleConfig);
router.post('/link-google', authenticateToken, authController.linkGoogleAccount);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/validate', authController.validateResetToken);
router.post('/reset-password', authController.resetPassword);

export default router;
