import { Response } from 'express';
import bcrypt from 'bcrypt';
import * as db from '../db';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError, handleControllerError } from '../utils/response';
import { computeWeeklyScore, combineCounts } from '../score';
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
 * Recalculate every stored session score using the latest scoring function.
 * Ensures consistency after changing BASE values, grade thresholds, or weighting.
 */
export async function recalculateAllScores(req: AuthRequest, res: Response) {
  try {
    const sessions = await db.getSessions({});
    if (sessions.length === 0) {
      return sendSuccess(res, {
        message: 'No sessions to recalculate',
        sessionsProcessed: 0,
        scoresChanged: 0,
        changedSessions: []
      });
    }

    const client = await db.getClient();
    const changedSessions: Array<{ sessionId: number; climberId: number; oldScore: number; newScore: number }> = [];
    let processed = 0;

    const toNumber = (value: any) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    try {
      await client.query('BEGIN');

      for (const session of sessions) {
        if (!session?.id) continue;

        const totals: Counts = session.wallCounts
          ? combineCounts(session.wallCounts as WallCounts)
          : {
              green: toNumber(session.green),
              blue: toNumber(session.blue),
              yellow: toNumber(session.yellow),
              orange: toNumber(session.orange),
              red: toNumber(session.red),
              black: toNumber(session.black)
            };

        const newScore = computeWeeklyScore(totals);
        const oldScore = toNumber(session.score);

        await client.query(
          `INSERT INTO counts (session_id, green, blue, yellow, orange, red, black)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (session_id)
           DO UPDATE SET
             green = EXCLUDED.green,
             blue = EXCLUDED.blue,
             yellow = EXCLUDED.yellow,
             orange = EXCLUDED.orange,
             red = EXCLUDED.red,
             black = EXCLUDED.black`,
          [
            session.id,
            totals.green,
            totals.blue,
            totals.yellow,
            totals.orange,
            totals.red,
            totals.black
          ]
        );

        await client.query('UPDATE sessions SET score = $1 WHERE id = $2', [newScore, session.id]);

        processed += 1;
        if (Math.abs(newScore - oldScore) > 1e-6) {
          changedSessions.push({
            sessionId: session.id,
            climberId: session.climberId,
            oldScore,
            newScore
          });
        }
      }

      await client.query('COMMIT');

      return sendSuccess(res, {
        message: `Recalculated ${processed} sessions using the current scoring system`,
        sessionsProcessed: processed,
        scoresChanged: changedSessions.length,
        changedSessions
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
 * - Sets the wall totals (expected routes) for this wall to all zeros
 * - For each climber: Creates an adjustment session that zeros out their climbs on this wall
 * - Recalculates total counts and session score
 * - Only includes wall sections the climber actually had climbs in (not empty sections)
 */
export async function resetWallSection(req: AuthRequest, res: Response) {
  try {
    const { wall } = req.body;
    if (!wall) return sendError(res, 'wall required', 400);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Step 1: Reset wall totals (expected routes) for this wall to all zeros
      const currentWallTotals = (await db.getSetting('wallTotals')) || {};
      if (currentWallTotals[wall]) {
        currentWallTotals[wall] = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
        await db.setSetting('wallTotals', currentWallTotals);
      }

      // Step 2: Find all climbers who have actual climbs (non-zero counts) for this wall
      const climberRes = await client.query(
        `SELECT DISTINCT s.climber_id FROM sessions s JOIN wall_counts w ON s.id = w.session_id WHERE w.counts ? $1`,
        [wall]
      );

      const changed: Array<any> = [];

      // Pre-generate auditId that we'll persist on created adjustment sessions
      const auditId = new Date().toISOString();

      for (const row of climberRes.rows) {
        const climberId = row.climber_id;

        // Use the climber's latest non-adjustment session's wall_counts as the baseline
        const wcRes = await client.query(
          "SELECT w.counts FROM sessions s JOIN wall_counts w ON s.id = w.session_id WHERE s.climber_id = $1 AND s.status != 'adjustment' ORDER BY s.date DESC LIMIT 1",
          [climberId]
        );

        const latestCountsObj: any = (wcRes.rows.length > 0 && wcRes.rows[0].counts) ? wcRes.rows[0].counts : {};

        // removedCounts are the totals on that section in the latest session
        const removedCounts = latestCountsObj[wall] || { green:0, blue:0, yellow:0, orange:0, red:0, black:0 };

        // If there are no climbs to remove for this climber on that wall, skip creating a proxy session
        const removedSum = Object.values(removedCounts).reduce((s:any, v:any) => s + (v || 0), 0);
        if (removedSum === 0) {
          // nothing to remove for this climber
          continue;
        }

        // Build new wallCounts: only include sections with actual climbs (non-zero totals)
        // This prevents empty sections from appearing in the adjustment session
        const newWallCounts: any = {};
        for (const section of Object.keys(latestCountsObj)) {
          if (section === wall) {
            // Zero out the reset wall
            newWallCounts[wall] = { green:0, blue:0, yellow:0, orange:0, red:0, black:0 };
          } else {
            // Only include other sections if they have any climbs
            const sectionCounts = latestCountsObj[section] || {};
            const sectionSum = Object.values(sectionCounts).reduce((s:any, v:any) => s + (v || 0), 0) as number;
            if (sectionSum > 0) {
              newWallCounts[section] = { ...sectionCounts };
            }
          }
        }

        // Compute totals and new score
        const totalCounts = combineCounts(newWallCounts as any);
        const newScore = computeWeeklyScore(totalCounts);

        // Determine previous official score (most recent non-adjustment session)
        const prevRes = await client.query(
          "SELECT score FROM sessions WHERE climber_id = $1 AND status != 'adjustment' ORDER BY date DESC LIMIT 1",
          [climberId]
        );
        const oldScore = prevRes.rows.length > 0 ? prevRes.rows[0].score : 0;

        // Create a proxy session (status = 'adjustment') dated today to represent the updated totals
        const today = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString();
        const noteLine = `Admin reset wall '${wall}' on ${timestamp}: removedCounts=${JSON.stringify(removedCounts)}, score ${oldScore} -> ${newScore} (audit:${auditId})`;

        // Insert session and persist the auditId on the session row (if column exists)
        const insertSession = await client.query(
          'INSERT INTO sessions (climber_id, date, score, notes, status, reset_audit_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [climberId, today, newScore, noteLine, 'adjustment', auditId]
        );
        const newSessionId = insertSession.rows[0].id;

        // Insert counts row
        await client.query(
          'INSERT INTO counts (session_id, green, blue, yellow, orange, red, black) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [newSessionId, totalCounts.green, totalCounts.blue, totalCounts.yellow, totalCounts.orange, totalCounts.red, totalCounts.black]
        );

        // Insert wall_counts JSONB (only includes sections with actual climbs)
        await client.query('INSERT INTO wall_counts (session_id, counts) VALUES ($1, $2)', [newSessionId, JSON.stringify(newWallCounts)]);

        changed.push({ climberId, newSessionId, oldScore, newScore, removedCounts, wall });
      }

      await client.query('COMMIT');

      // Persist audit record
      try {
        const audits = (await db.getSetting('reset_audits')) || [];
        const audit = {
          id: auditId,
          wall,
          performedBy: req.user?.climberId || null,
          performedAt: new Date().toISOString(),
          changes: changed,
          undone: false
        };
        audits.push(audit);
        await db.setSetting('reset_audits', audits);

        return sendSuccess(res, {
          message: `Reset wall '${wall}': totals set to 0, created ${changed.length} adjustment sessions`,
          changed,
          auditId
        });
      } catch (auditErr) {
        return sendSuccess(res, {
          message: `Reset wall '${wall}': totals set to 0, created ${changed.length} adjustment sessions (audit save failed)`,
          changed
        });
      }
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

/**
 * Undo a previous reset using auditId. If auditId is not provided, undo the most recent non-undone reset for the given wall.
 */
export async function undoResetWallSection(req: AuthRequest, res: Response) {
  try {
    const { auditId, wall } = req.body;
    const audits: any[] = (await db.getSetting('reset_audits')) || [];

    let audit: any;
    if (auditId) {
      audit = audits.find(a => a.id === auditId);
    } else if (wall) {
      // pick most recent non-undone audit for this wall
      audit = [...audits].reverse().find(a => a.wall === wall && !a.undone);
    } else {
      // pick most recent non-undone audit overall
      audit = [...audits].reverse().find(a => !a.undone);
    }

    if (!audit) return sendError(res, 'Audit record not found', 404);
    if (audit.undone) return sendError(res, 'This reset has already been undone', 400);

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // For proxy adjustment sessions we created, undo should delete those adjustment sessions and restore nothing in original historical sessions
      for (const change of audit.changes) {
        const newSessionId = change.newSessionId || change.newSession || change.sessionId;
        if (!newSessionId) continue;

        // Delete counts and wall_counts rows (CASCADE on sessions should handle this, but be explicit)
        await client.query('DELETE FROM counts WHERE session_id = $1', [newSessionId]).catch(() => {});
        await client.query('DELETE FROM wall_counts WHERE session_id = $1', [newSessionId]).catch(() => {});
        await client.query('DELETE FROM sessions WHERE id = $1', [newSessionId]).catch(() => {});
      }

      await client.query('COMMIT');

      // Mark audit as undone
      const updatedAudits = audits.map(a => {
        if (a.id === audit.id) return { ...a, undone: true, undoneAt: new Date().toISOString(), undoneBy: req.user?.climberId || null };
        return a;
      });
      await db.setSetting('reset_audits', updatedAudits);

      return sendSuccess(res, { message: `Undo of reset '${audit.id}' completed`, auditId: audit.id });
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

/**
 * List reset audits
 */
export async function listResetAudits(req: AuthRequest, res: Response) {
  try {
    const audits: any[] = (await db.getSetting('reset_audits')) || [];
    return sendSuccess(res, { audits });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Public: Get admin-published notifications (latest first)
 */
export async function getAdminNotifications(req: AuthRequest, res: Response) {
  try {
    const notes: any[] = (await db.getSetting('admin_notifications')) || [];
    return sendSuccess(res, { notifications: notes });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

/**
 * Admin: publish a notification message
 */
export async function setAdminNotification(req: AuthRequest, res: Response) {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') return sendError(res, 'message required', 400);

    const notifications = (await db.getSetting('admin_notifications')) || [];
    const note = {
      id: new Date().toISOString(),
      message,
      createdBy: req.user?.climberId || null,
      createdAt: new Date().toISOString()
    };
    // prepend so latest is first
    notifications.unshift(note);
    // keep latest 50 only
    const truncated = notifications.slice(0, 50);
    await db.setSetting('admin_notifications', truncated);

    return sendSuccess(res, { notification: note });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
}

