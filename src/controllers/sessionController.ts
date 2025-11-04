import { Response } from 'express';
import * as db from '../db';
import { scoreSession, validateCounts, combineCounts } from '../score';
import { AuthRequest } from '../middleware/auth';
import { Counts, WallCounts } from '../types';
import { sendSuccess, sendError, handleControllerError } from '../utils/response';

/**
 * Add a new session
 */
export async function addSession(req: AuthRequest, res: Response) {
  try {
    const { climberId, date, counts, wallCounts, notes } = req.body;
    
    if (!climberId || !date) {
      return sendError(res, 'climberId and date required', 400);
    }
    
    let totalCounts: Counts;
    
    if (wallCounts) {
      // Validate and combine wall counts
      const validatedWalls: WallCounts = {
        overhang: validateCounts(wallCounts.overhang || {}),
        midWall: validateCounts(wallCounts.midWall || {}),
        sideWall: validateCounts(wallCounts.sideWall || {})
      };
      totalCounts = combineCounts(validatedWalls);
      const score = scoreSession(totalCounts);
      const session = { climberId, date, notes: notes || null, score };
      const out = await db.addSession(session as any, totalCounts, validatedWalls);
      
      return res.json({ 
        id: out.id, 
        climberId, 
        date, 
        counts: totalCounts, 
        wallCounts: validatedWalls, 
        score 
      });
    } else {
      // Legacy: flat counts
      totalCounts = validateCounts(counts || {});
      const score = scoreSession(totalCounts);
      const session = { climberId, date, notes: notes || null, score };
      const out = await db.addSession(session as any, totalCounts);
      
      return res.json({ 
        id: out.id, 
        climberId, 
        date, 
        counts: totalCounts, 
        score 
      });
    }
  } catch (err: any) {
    return sendError(res, err.message, 400);
  }
}

/**
 * Get sessions with optional filters
 */
export async function getSessions(req: AuthRequest, res: Response) {
  try {
    const { from, to, climberId } = req.query as any;
    const rows = await db.getSessions({ 
      from: from as string | undefined, 
      to: to as string | undefined, 
      climberId: climberId ? Number(climberId) : undefined 
    });
    return res.json(rows);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Get a single session by ID
 */
export async function getSessionById(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const row = await db.getSessionById(id);
    if (!row) {
      return sendError(res, 'Session not found', 404);
    }
    return res.json(row);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Delete a session (admin only)
 */
export async function deleteSession(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    const deleted = await db.deleteSession(id);
    if (!deleted) {
      return sendError(res, 'Session not found', 404);
    }
    return sendSuccess(res, { message: 'Session deleted' });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(req: AuthRequest, res: Response) {
  try {
    const { from, to } = req.query as any;
    const rows = await db.leaderboard(from as string | undefined, to as string | undefined);
    return res.json(rows);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}
