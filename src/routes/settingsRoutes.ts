import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getSetting, setSetting } from '../db';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/wall-sections');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'wall-section-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Upload wall section image (admin only)
router.post('/upload-wall-image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }
    
    const { section } = req.body;
    if (!section) {
      // Delete uploaded file if section not provided
      fs.unlinkSync(req.file.path);
      return sendError(res, 'Wall section name required', 400);
    }
    
    // Get current images
    const wallSectionImages = await getSetting('wallSectionImages') || {};
    
    // Delete old image file if it exists
    if (wallSectionImages[section]) {
      const oldImagePath = path.join(__dirname, '../../', wallSectionImages[section]);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // Store relative path from project root
    const imagePath = `/uploads/wall-sections/${req.file.filename}`;
    wallSectionImages[section] = imagePath;
    
    await setSetting('wallSectionImages', wallSectionImages);
    
    sendSuccess(res, { 
      message: 'Image uploaded successfully',
      imagePath: imagePath
    });
  } catch (error: any) {
    console.error('Error uploading wall image:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    sendError(res, error.message);
  }
});

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
