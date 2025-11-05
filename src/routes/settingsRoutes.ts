import { Router } from 'express';
import { getSetting, setSetting } from '../db';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Get wall totals configuration
router.get('/wall-totals', async (req, res) => {
  try {
    const wallTotals = await getSetting('wallTotals');
    
    // Default configuration if not set
    const defaultWallTotals = {
      overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },
      midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },
      sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }
    };
    
    sendSuccess(res, { data: wallTotals || defaultWallTotals });
  } catch (error: any) {
    console.error('Error getting wall totals:', error);
    sendError(res, error.message);
  }
});

// Set wall totals configuration (admin only)
router.post('/wall-totals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const wallTotals = req.body;
    await setSetting('wallTotals', wallTotals);
    sendSuccess(res, { message: 'Wall totals updated successfully' });
  } catch (error: any) {
    console.error('Error setting wall totals:', error);
    sendError(res, error.message);
  }
});

// Get wall section images configuration
router.get('/wall-section-images', async (req, res) => {
  try {
    const wallSectionImages = await getSetting('wallSectionImages');
    sendSuccess(res, { data: wallSectionImages || {} });
  } catch (error: any) {
    console.error('Error getting wall section images:', error);
    sendError(res, error.message);
  }
});

// Set wall section images configuration (admin only)
router.post('/wall-section-images', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const wallSectionImages = req.body;
    await setSetting('wallSectionImages', wallSectionImages);
    sendSuccess(res, { message: 'Wall section images updated successfully' });
  } catch (error: any) {
    console.error('Error setting wall section images:', error);
    sendError(res, error.message);
  }
});

export default router;
