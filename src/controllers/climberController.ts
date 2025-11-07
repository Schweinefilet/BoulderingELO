import { Response } from 'express';
import * as db from '../db';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, handleControllerError } from '../utils/response';

/**
 * Get all climbers
 */
export async function getAllClimbers(req: AuthRequest, res: Response) {
  try {
    const isAdmin = req.user?.role === 'admin';
    const rows = await db.listClimbers(isAdmin);
    return res.json(rows);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Add a new climber (admin only)
 */
export async function addClimber(req: AuthRequest, res: Response) {
  try {
    const { name } = req.body;
    if (!name) {
      return sendError(res, 'name required', 400);
    }
    const climber = await db.addClimber(name);
    return res.json(climber);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Delete a climber (admin only)
 */
export async function deleteClimber(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const deleted = await db.deleteClimber(id);
    if (!deleted) {
      return sendError(res, 'Climber not found', 404);
    }
    return sendSuccess(res, { message: 'Climber deleted' });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Update user settings
 */
export async function updateSettings(req: AuthRequest, res: Response) {
  try {
    const { username, name, country, started_bouldering, bio } = req.body;
    const result = await db.updateUserSettings(req.user!.climberId, { 
      username,
      name,
      country, 
      started_bouldering, 
      bio 
    });
    return sendSuccess(res, { user: result });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Delete user account
 */
export async function deleteAccount(req: AuthRequest, res: Response) {
  try {
    const climberId = req.user!.climberId;
    
    // Delete the climber (cascades to sessions)
    const deleted = await db.deleteClimber(climberId);
    
    if (!deleted) {
      return sendError(res, 'Account not found', 404);
    }
    
    return sendSuccess(res, { message: 'Account deleted successfully' });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}
