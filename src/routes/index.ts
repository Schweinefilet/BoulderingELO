import { Router } from 'express';
import authRoutes from './authRoutes';
import climberRoutes from './climberRoutes';
import sessionRoutes from './sessionRoutes';
import videoRoutes from './videoRoutes';
import adminRoutes from './adminRoutes';
import userRoutes from './userRoutes';
import leaderboardRoutes from './leaderboardRoutes';

const router = Router();

/**
 * Mount all API routes
 */
router.use('/auth', authRoutes);
router.use('/climbers', climberRoutes);
router.use('/sessions', sessionRoutes);
router.use('/videos', videoRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;
