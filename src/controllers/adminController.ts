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
 * Merge duplicate sessions (same climber, same date)
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
    
    let mergedCount = 0;
    let deletedCount = 0;
    
    // Process each group that has duplicates
    for (const [key, sessions] of grouped.entries()) {
      if (sessions.length > 1) {
        // Merge all sessions in this group
        const [climberId, date] = key.split('-');
        
        // Combine all wall counts
        let mergedWalls: WallCounts | undefined;
        let mergedNotes: string[] = [];
        
        for (const session of sessions) {
          if (session.notes) mergedNotes.push(session.notes);
          
          if (session.wallCounts) {
            if (!mergedWalls) {
              mergedWalls = {
                overhang: { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 },
                midWall: { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 },
                sideWall: { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 }
              };
            }
            
            // Add counts from this session
            for (const wall of ['overhang', 'midWall', 'sideWall'] as const) {
              for (const color of ['green', 'blue', 'yellow', 'orange', 'red', 'black'] as const) {
                (mergedWalls[wall] as any)[color] += (session.wallCounts[wall]?.[color] || 0);
              }
            }
          }
        }
        
        // Calculate merged totals
        const totalCounts = mergedWalls ? combineCounts(mergedWalls) : {
          green: sessions.reduce((sum, s) => sum + (s.green || 0), 0),
          blue: sessions.reduce((sum, s) => sum + (s.blue || 0), 0),
          yellow: sessions.reduce((sum, s) => sum + (s.yellow || 0), 0),
          orange: sessions.reduce((sum, s) => sum + (s.orange || 0), 0),
          red: sessions.reduce((sum, s) => sum + (s.red || 0), 0),
          black: sessions.reduce((sum, s) => sum + (s.black || 0), 0)
        };
        
        const score = scoreSession(totalCounts);
        const notes = mergedNotes.filter(Boolean).join('\n\n') || null;
        
        // Delete all old sessions
        for (const session of sessions) {
          await db.deleteSession(session.id);
          deletedCount++;
        }
        
        // Create merged session
        await db.addSession(
          { climberId: Number(climberId), date, notes, score } as any,
          totalCounts,
          mergedWalls
        );
        
        mergedCount++;
      }
    }
    
    return sendSuccess(res, { 
      message: `Merged ${mergedCount} duplicate session groups (deleted ${deletedCount} duplicate entries)`,
      mergedCount,
      deletedCount
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}
