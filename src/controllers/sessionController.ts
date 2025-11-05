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
    
    if (wallCounts) {
      // Validate and combine wall counts
      validatedWalls = {
        overhang: validateCounts(wallCounts.overhang || {}),
        midWall: validateCounts(wallCounts.midWall || {}),
        sideWall: validateCounts(wallCounts.sideWall || {})
      };
      totalCounts = combineCounts(validatedWalls);
    } else {
      // Legacy: flat counts
      totalCounts = validateCounts(counts || {});
    }
    
    if (existingSessions.length > 0) {
      // Merge with existing session(s)
      const existing = existingSessions[0];
      
      // Merge wall counts if both have them
      if (validatedWalls && existing.wallCounts) {
        const mergedWalls: WallCounts = {
          overhang: mergeCountObjects(existing.wallCounts.overhang, validatedWalls.overhang),
          midWall: mergeCountObjects(existing.wallCounts.midWall, validatedWalls.midWall),
          sideWall: mergeCountObjects(existing.wallCounts.sideWall, validatedWalls.sideWall)
        };
        validatedWalls = mergedWalls;
        totalCounts = combineCounts(mergedWalls);
      } else if (existing.wallCounts) {
        // Existing has wallCounts, new doesn't - keep existing structure
        validatedWalls = existing.wallCounts as WallCounts;
        totalCounts = combineCounts(validatedWalls);
      } else {
        // Merge flat counts
        totalCounts = mergeCountObjects(
          { green: existing.green, blue: existing.blue, yellow: existing.yellow, 
            orange: existing.orange, red: existing.red, black: existing.black },
          totalCounts
        );
      }
      
      // Merge notes
      const mergedNotes = [existing.notes, notes].filter(Boolean).join('\n\n');
      
      // Delete old session(s) before creating merged one
      for (const oldSession of existingSessions) {
        await db.deleteSession(oldSession.id);
      }
      
      // Create new merged session
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
        merged: true,
        mergedCount: existingSessions.length
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

// Helper function to merge count objects by adding values
function mergeCountObjects(existing: any, newCounts: any): Counts {
  return {
    green: (existing.green || 0) + (newCounts.green || 0),
    blue: (existing.blue || 0) + (newCounts.blue || 0),
    yellow: (existing.yellow || 0) + (newCounts.yellow || 0),
    orange: (existing.orange || 0) + (newCounts.orange || 0),
    red: (existing.red || 0) + (newCounts.red || 0),
    black: (existing.black || 0) + (newCounts.black || 0)
  };
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
