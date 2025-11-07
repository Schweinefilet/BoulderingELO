import { Response } from 'express';
import * as db from '../db';
import { scoreSession, validateCounts, combineCounts } from '../score';
import { AuthRequest } from '../middleware/auth';
import { Counts, WallCounts } from '../types';
import { sendSuccess, sendError, handleControllerError } from '../utils/response';

/**
 * Add a new session (merges with existing session on same date if found)
 */
export async function addSession(req: AuthRequest, res: Response) {
  try {
    const { climberId, date, counts, wallCounts, notes } = req.body;
    
    if (!climberId || !date) {
      return sendError(res, 'climberId and date required', 400);
    }
    
    // Check if a session already exists for this climber on this date
    const existingSessions = await db.getSessions({ 
      climberId: Number(climberId), 
      from: date, 
      to: date 
    });
    
    let totalCounts: Counts;
    let validatedWalls: WallCounts | undefined;
    
    // Get expired sections to exclude from scoring
    const expiredSections = (await db.getSetting('expiredSections')) || [];
    
    if (wallCounts) {
      // Validate and combine wall counts - support dynamic wall sections
      validatedWalls = {} as WallCounts;
      for (const wallSection of Object.keys(wallCounts)) {
        validatedWalls[wallSection] = validateCounts(wallCounts[wallSection] || {});
      }
      totalCounts = combineCounts(validatedWalls, expiredSections);
    } else {
      // Legacy: flat counts
      totalCounts = validateCounts(counts || {});
    }
    
    if (existingSessions.length > 0) {
      // Replace existing session with new data (don't add - just keep latest)
      console.log(`Replacing existing session for climber ${climberId} on ${date}`);
      
      // Use the NEW data, not merged/added
      // Just use the validatedWalls and totalCounts from the new submission
      
      // Keep existing notes and append new ones if provided
      const existing = existingSessions[0];
      const mergedNotes = notes ? 
        (existing.notes ? `${existing.notes}\n\n${notes}` : notes) : 
        existing.notes;
      
      // Delete old session(s) before creating replacement
      for (const oldSession of existingSessions) {
        await db.deleteSession(oldSession.id);
      }
      
      // Create new session with ONLY the new data (not added together)
      const score = scoreSession(totalCounts);
      const session = { climberId, date, notes: mergedNotes || null, score };
      const out = await db.addSession(session as any, totalCounts, validatedWalls);
      
      return res.json({ 
        id: out.id, 
        climberId, 
        date, 
        counts: totalCounts, 
        wallCounts: validatedWalls, 
        score,
        replaced: true,
        replacedCount: existingSessions.length
      });
    } else {
      // No existing session - create new one
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
    const isAdmin = req.user?.role === 'admin';
    const rows = await db.leaderboard(from as string | undefined, to as string | undefined, isAdmin);
    return res.json(rows);
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}
