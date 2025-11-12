import { Response } from 'express';
import bcrypt from 'bcrypt';
import * as db from '../db';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, handleControllerError } from '../utils/response';
import { scoreSession, combineCounts } from '../score';
import { Counts, WallCounts } from '../types';

/**
 * Wipe all data from database (emergency endpoint)
 */
export async function wipeAllData(req: AuthRequest, res: Response) {
  try {
    await db.clearAllData();
    return sendSuccess(res, { 
      message: 'All data wiped successfully. Database is now empty.'
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Promote a user to admin
 */
export async function promoteUser(req: AuthRequest, res: Response) {
  try {
    const { climberId } = req.body;
    await db.setClimberRole(climberId, 'admin');
    return sendSuccess(res, { 
      message: 'User promoted to admin successfully'
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Fix username to lowercase
 */
export async function fixUsername(req: AuthRequest, res: Response) {
  try {
    const { climberId, username } = req.body;
    await db.updateClimberUsername(climberId, username);
    return sendSuccess(res, { 
      message: 'Username updated to lowercase'
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Create a new account
 */
export async function createAccount(req: AuthRequest, res: Response) {
  try {
    const { name, username, password, role } = req.body;
    
    if (!name || !username || !password) {
      return sendError(res, 'name, username, and password required', 400);
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const climber = await db.addClimber(
      name, 
      username.toLowerCase(), 
      hashedPassword, 
      role || 'user'
    );
    
    return sendSuccess(res, {
      climber: {
        id: climber.id,
        name: climber.name,
        username: climber.username,
        role: climber.role
      }
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Reset database and seed with sample data
 */
export async function resetAndSeed(req: AuthRequest, res: Response) {
  try {
    const sampleData = {
      climbers: [
        {
          name: 'Keith Duong',
          username: 'keith',
          role: 'admin',
          sessions: [
            {
              date: '2025-10-31',
              wallCounts: {
                overhang: { green:0, blue:0, yellow:4, orange:0, red:0, black:0 },
                midWall: { green:0, blue:0, yellow:10, orange:0, red:0, black:0 },
                sideWall: { green:0, blue:0, yellow:4, orange:1, red:0, black:0 }
              },
              notes: 'Keith Rock Climbing (Oct 31)'
            }
          ]
        }
      ]
    };

    await db.clearAllData();
    await db.seedData(sampleData);
    
    return sendSuccess(res, { 
      message: 'Database wiped and seeded with sample data'
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Merge duplicate sessions (same climber, same date) - keeps the session with most climbs
 */
export async function mergeDuplicateSessions(req: AuthRequest, res: Response) {
  try {
    const allSessions = await db.getSessions({});
    
    // Group sessions by climber and date
    const grouped = new Map<string, any[]>();
    
    for (const session of allSessions) {
      const key = `${session.climberId}-${session.date}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(session);
    }
    
    let deletedCount = 0;
    let groupsProcessed = 0;
    
    // Process each group that has duplicates
    for (const [key, sessions] of grouped.entries()) {
      if (sessions.length > 1) {
        groupsProcessed++;
        
        // Find the session with the most total climbs (keep that one)
        let bestSession = sessions[0];
        let maxClimbs = (bestSession.green || 0) + (bestSession.blue || 0) + (bestSession.yellow || 0) + 
                        (bestSession.orange || 0) + (bestSession.red || 0) + (bestSession.black || 0);
        
        for (const session of sessions) {
          const totalClimbs = (session.green || 0) + (session.blue || 0) + (session.yellow || 0) + 
                             (session.orange || 0) + (session.red || 0) + (session.black || 0);
          if (totalClimbs > maxClimbs) {
            bestSession = session;
            maxClimbs = totalClimbs;
          }
        }
        
        // Delete all sessions except the best one
        for (const session of sessions) {
          if (session.id !== bestSession.id) {
            await db.deleteSession(session.id);
            deletedCount++;
          }
        }
      }
    }
    
    return sendSuccess(res, { 
      message: `Processed ${groupsProcessed} duplicate groups, deleted ${deletedCount} duplicate sessions`,
      groupsProcessed,
      deletedCount
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Update climber profile (admin only - can edit all fields)
 */
export async function updateClimberProfile(req: AuthRequest, res: Response) {
  try {
    const { climberId } = req.params;
    const updates = req.body;
    
    if (!climberId) {
      return sendError(res, 'climberId required', 400);
    }
    
    const updatedClimber = await db.updateClimberProfile(Number(climberId), updates);
    
    if (!updatedClimber) {
      return sendError(res, 'Climber not found', 404);
    }
    
    return sendSuccess(res, { climber: updatedClimber });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Reset a wall section across all sessions.
 * - Removes the wall key from each session's wall_counts JSONB
 * - Recalculates total counts and session score
 * - Updates the counts table and sessions.score
 * - Appends an explanatory note to the session's notes field describing the change
 */
export async function resetWallSection(req: AuthRequest, res: Response) {
  try {
    const { wall } = req.body;
    if (!wall) return sendError(res, 'wall required', 400);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const q = `
        SELECT s.id, s.climber_id, s.score, s.notes, w.counts
        FROM sessions s
        JOIN wall_counts w ON s.id = w.session_id
        WHERE w.counts ? $1
      `;
      const result = await client.query(q, [wall]);

      const changed: Array<any> = [];

      for (const row of result.rows) {
        const sessionId = row.id;
        const climberId = row.climber_id;
        const existingNotes: string | null = row.notes;
        const wallCounts: any = row.counts || {};

        if (!wallCounts || !Object.prototype.hasOwnProperty.call(wallCounts, wall)) {
          continue;
        }

        const removedCounts = wallCounts[wall];

  // Zero out the wall section (do not delete the key) so it can be re-added later
  wallCounts[wall] = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };

  // Recalculate totals and score
  const oldTotals = combineCounts({ ...(wallCounts as any), [wall]: removedCounts } as any);
  const newTotals = combineCounts(wallCounts as any);
  const oldScore = row.score || scoreSession(oldTotals);
  const newScore = scoreSession(newTotals);

        // Update wall_counts JSONB
        await client.query('UPDATE wall_counts SET counts = $1 WHERE session_id = $2', [JSON.stringify(wallCounts), sessionId]);

        // Update counts table
        await client.query(
          'UPDATE counts SET green = $1, blue = $2, yellow = $3, orange = $4, red = $5, black = $6 WHERE session_id = $7',
          [newTotals.green, newTotals.blue, newTotals.yellow, newTotals.orange, newTotals.red, newTotals.black, sessionId]
        );

        // Append explanatory note to session
        const timestamp = new Date().toISOString();
        const noteLine = `Admin reset wall '${wall}' on ${timestamp}: removedCounts=${JSON.stringify(removedCounts)}, score ${oldScore} -> ${newScore}`;
        const updatedNotes = existingNotes ? `${existingNotes}\n${noteLine}` : noteLine;

        // Update session score and notes
        await client.query('UPDATE sessions SET score = $1, notes = $2 WHERE id = $3', [newScore, updatedNotes, sessionId]);

        changed.push({ sessionId, climberId, oldScore, newScore, removedCounts });
      }

      await client.query('COMMIT');

      return sendSuccess(res, {
        message: `Reset wall '${wall}' for ${changed.length} sessions`,
        changed
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

