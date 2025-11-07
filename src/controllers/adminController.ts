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
 * Expire a wall section - WIPE all climb data from this section for ALL users
 */
export async function addExpiredSection(req: AuthRequest, res: Response) {
  try {
    const { sectionName } = req.body;
    
    if (!sectionName) {
      return sendError(res, 'sectionName required', 400);
    }
    
    // Get all sessions and remove climbs from this section
    const allSessions = await db.getSessions({});
    let updatedCount = 0;
    
    for (const session of allSessions) {
      if (session.wallCounts && session.wallCounts[sectionName]) {
        // Remove this section from wallCounts
        const updatedWallCounts = { ...session.wallCounts };
        delete updatedWallCounts[sectionName];
        
        // Recalculate score without this section
        const totalCounts = combineCounts(updatedWallCounts);
        const newScore = scoreSession(totalCounts);
        
        // Update session in database
        await db.updateSessionWallCounts(session.id, updatedWallCounts, newScore);
        updatedCount++;
      }
    }
    
    // Track this section as expired for UI notifications
    const expiredSections = (await db.getSetting('expiredSections')) || [];
    if (!expiredSections.includes(sectionName)) {
      expiredSections.push(sectionName);
      await db.setSetting('expiredSections', expiredSections);
    }
    
    return sendSuccess(res, { 
      message: `Section expired: removed ${sectionName} from ${updatedCount} sessions`,
      expiredSections,
      updatedCount
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Get list of expired sections
 */
export async function getExpiredSections(req: AuthRequest, res: Response) {
  try {
    const expiredSections = (await db.getSetting('expiredSections')) || [];
    return sendSuccess(res, { expiredSections });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Remove a section from expired list (if routes are reinstated)
 */
export async function removeExpiredSection(req: AuthRequest, res: Response) {
  try {
    const { sectionName } = req.body;
    
    if (!sectionName) {
      return sendError(res, 'sectionName required', 400);
    }
    
    const expiredSections = (await db.getSetting('expiredSections')) || [];
    const filtered = expiredSections.filter((s: string) => s !== sectionName);
    
    await db.setSetting('expiredSections', filtered);
    
    return sendSuccess(res, { 
      message: 'Section removed from expired list',
      expiredSections: filtered 
    });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}


