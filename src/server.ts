import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as db from './db';
import { scoreSession, validateCounts, combineCounts } from './score';
import { Counts, WallCounts } from './types';

const app = express();

// JWT Secret (set in environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// CORS configuration - allow GitHub Pages
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://schweinefilet.github.io'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// Middleware to verify JWT token and get user info
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Middleware to check if user is admin
function requireAdmin(req: any, res: any, next: any) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'BoulderingELO API',
    endpoints: {
      auth: {
        post: '/api/auth/login',
        post_register: '/api/auth/register'
      },
      climbers: {
        post: '/api/climbers',
        get: '/api/climbers'
      },
      sessions: {
        post: '/api/sessions',
        get: '/api/sessions?from=&to=&climberId=',
        getById: '/api/sessions/:id'
      },
      leaderboard: {
        get: '/api/leaderboard?from=&to='
      },
      videos: {
        get: '/api/videos',
        post_vote: '/api/videos/:id/vote',
        post_approve: '/api/videos/:id/approve',
        post_reject: '/api/videos/:id/reject'
      },
      admin: {
        post_wipe: '/api/admin/wipe-all-data'
      }
    }
  });
});

// POST /api/admin/wipe-all-data - PUBLIC endpoint to wipe all data (no auth required for emergency access)
// SECURITY NOTE: In production, you'd want to protect this with a secret key or IP whitelist
app.post('/api/admin/wipe-all-data', async (req, res) => {
  try {
    await db.clearAllData();
    res.json({ 
      success: true, 
      message: 'All data wiped successfully. Database is now empty.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/promote-user - PUBLIC endpoint to promote first user to admin
app.post('/api/admin/promote-user', async (req, res) => {
  const { climberId } = req.body;
  
  try {
    await db.setClimberRole(climberId, 'admin');
    res.json({ 
      success: true, 
      message: `User promoted to admin successfully`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/create-account - PUBLIC endpoint to create accounts
app.post('/api/admin/create-account', async (req, res) => {
  const { name, username, password, role } = req.body;
  
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'name, username, and password required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Convert username to lowercase for case-insensitive storage
    const climber = await db.addClimber(name, username.toLowerCase(), hashedPassword, role || 'user');
    
    res.json({
      success: true,
      climber: {
        id: climber.id,
        name: climber.name,
        username: climber.username,
        role: climber.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login {username, password}
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Convert username to lowercase for case-insensitive lookup
    const climber = await db.getClimberByUsername(username.toLowerCase());
    
    if (!climber || !climber.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, climber.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { climberId: climber.id, username: climber.username, role: climber.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      token,
      success: true,
      user: {
        climberId: climber.id,
        username: climber.username,
        role: climber.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register {name, username, password}
app.post('/api/auth/register', async (req, res) => {
  const { name, username, password } = req.body;
  
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'name, username, and password required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Convert username to lowercase for case-insensitive storage
    const climber = await db.addClimber(name, username.toLowerCase(), hashedPassword, 'user');
    
    const token = jwt.sign(
      { climberId: climber.id, username: climber.username, role: climber.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      token,
      success: true,
      user: {
        climberId: climber.id,
        username: climber.username,
        role: climber.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password {currentPassword, newPassword}
app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  
  try {
    // Get current user's data
    const climber = await db.getClimberByUsername(req.user.username);
    if (!climber || !climber.password) {
      return res.status(404).json({ error: 'User account not found' });
    }
    
    // Verify current password
    const valid = await bcrypt.compare(currentPassword, climber.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateClimberPassword(climber.id, hashedPassword);
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/merge-keith-accounts (admin only)
app.post('/api/admin/merge-keith-accounts', authenticateToken, requireAdmin, async (req: any, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Find both climbers
    const keithResult = await client.query(
      "SELECT id, name FROM climbers WHERE name = 'Keith'"
    );
    
    const keithDuongResult = await client.query(
      "SELECT id, name FROM climbers WHERE name = 'Keith Duong'"
    );

    if (keithResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '"Keith" account not found' });
    }

    if (keithDuongResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '"Keith Duong" account not found' });
    }

    const keithId = keithResult.rows[0].id;
    const keithDuongId = keithDuongResult.rows[0].id;

    // Count sessions
    const keithSessions = await client.query(
      'SELECT COUNT(*) as count FROM sessions WHERE climber_id = $1',
      [keithId]
    );

    // Transfer all Keith's sessions to Keith Duong
    const transferResult = await client.query(
      'UPDATE sessions SET climber_id = $1 WHERE climber_id = $2',
      [keithDuongId, keithId]
    );

    // Delete old Keith account
    await client.query('DELETE FROM climbers WHERE id = $1', [keithId]);

    // Setup Keith Duong as admin with username/password
    const username = 'keith';
    const password = 'boulder123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query(
      'UPDATE climbers SET username = $1, password = $2, role = $3 WHERE id = $4',
      [username, hashedPassword, 'admin', keithDuongId]
    );

    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Keith account merged into Keith Duong successfully',
      details: {
        sessionsMoved: transferResult.rowCount,
        username: 'keith',
        password: 'boulder123',
        note: 'Please change password after login'
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/admin/reset-and-seed (admin only) - wipe DB and seed with provided sample
app.post('/api/admin/reset-and-seed', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    // Default sample data (dates use 2025-10-31 and 2025-10-29)
    const sample = {
      climbers: [
        {
          name: 'Keith Duong',
          username: 'keith',
          role: 'admin',
          sessions: [
            {
              date: '2025-10-31',
              wallCounts: {
                overhang: { green:0,blue:0,yellow:4,orange:0,red:0,black:0 },
                midWall: { green:0,blue:0,yellow:10,orange:0,red:0,black:0 },
                sideWall: { green:0,blue:0,yellow:4,orange:1,red:0,black:0 }
              },
              notes: 'Keith Rock Climbing (Oct 31)'
            },
            {
              date: '2025-10-29',
              wallCounts: {
                overhang: { green:0,blue:0,yellow:4,orange:0,red:0,black:0 },
                midWall: { green:0,blue:0,yellow:8,orange:0,red:0,black:0 },
                sideWall: { green:0,blue:0,yellow:3,orange:0,red:0,black:0 }
              },
              notes: 'Keith (Oct 29)'
            }
          ]
        },
        {
          name: 'Unmesh',
          username: 'unmesh',
          role: 'user',
          sessions: [
            {
              date: '2025-10-31',
              wallCounts: {
                overhang: { green:0,blue:0,yellow:2,orange:0,red:0,black:0 },
                midWall: { green:0,blue:0,yellow:5,orange:0,red:0,black:0 },
                sideWall: { green:0,blue:0,yellow:2,orange:0,red:0,black:0 }
              }
            },
            {
              date: '2025-10-29',
              wallCounts: {
                overhang: { green:0,blue:0,yellow:1,orange:0,red:0,black:0 },
                midWall: { green:0,blue:0,yellow:4,orange:0,red:0,black:0 },
                sideWall: { green:0,blue:0,yellow:2,orange:0,red:0,black:0 }
              }
            }
          ]
        },
        {
          name: 'Rehan',
          username: 'rehan',
          role: 'user',
          sessions: [
            {
              date: '2025-10-31',
              wallCounts: {
                overhang: { green:0,blue:0,yellow:4,orange:0,red:0,black:0 },
                midWall: { green:0,blue:0,yellow:10,orange:0,red:0,black:0 },
                sideWall: { green:0,blue:0,yellow:2,orange:0,red:0,black:0 }
              }
            }
          ]
        }
      ]
    };

    await db.clearAllData();
    await db.seedData(sample);
    res.json({ success: true, message: 'Database wiped and seeded with sample data' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/wipe-and-import (admin only)
app.post('/api/admin/wipe-and-import', authenticateToken, requireAdmin, async (req: any, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Delete all data in correct order
    await client.query('DELETE FROM video_reviews');
    await client.query('DELETE FROM wall_counts');
    await client.query('DELETE FROM counts');
    await client.query('DELETE FROM sessions');
    await client.query('DELETE FROM climbers');
    
    // Import fresh data
    const CLIMBERS = [
      { name: 'Keith Duong', username: 'keith', password: 'boulder123', role: 'admin' },
      { name: 'Unmesh', username: 'unmesh', password: 'boulder123', role: 'user' },
      { name: 'Rehan', username: 'rehan', password: 'boulder123', role: 'user' }
    ];

    const climberMap: any = {};
    for (const climber of CLIMBERS) {
      const hashedPassword = await bcrypt.hash(climber.password, 10);
      const result = await client.query(
        'INSERT INTO climbers (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [climber.name, climber.username, hashedPassword, climber.role]
      );
      climberMap[climber.name] = result.rows[0].id;
    }

    const SESSIONS = [
      // Keith Oct 31
      {
        climber: 'Keith Duong', date: '2024-10-31', notes: 'Rock Climbing session',
        wallCounts: {
          midWall: { yellow: 10, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          overhang: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          sideWall: { yellow: 4, orange: 1, red: 0, black: 0, blue: 0, green: 0 }
        }
      },
      // Keith Oct 29
      {
        climber: 'Keith Duong', date: '2024-10-29', notes: 'Session',
        wallCounts: {
          midWall: { yellow: 8, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          overhang: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          sideWall: { yellow: 3, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
        }
      },
      // Unmesh Oct 31
      {
        climber: 'Unmesh', date: '2024-10-31', notes: 'Session',
        wallCounts: {
          midWall: { yellow: 5, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          overhang: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          sideWall: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
        }
      },
      // Unmesh Oct 29
      {
        climber: 'Unmesh', date: '2024-10-29', notes: 'Session',
        wallCounts: {
          midWall: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          overhang: { yellow: 1, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          sideWall: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
        }
      },
      // Rehan Oct 31
      {
        climber: 'Rehan', date: '2024-10-31', notes: 'Session',
        wallCounts: {
          midWall: { yellow: 10, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          overhang: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
          sideWall: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
        }
      }
    ];

    let sessionCount = 0;
    for (const session of SESSIONS) {
      const climberId = climberMap[session.climber];
      
      // Calculate score
      const { scoreSession } = require('./score');
      const totalCounts: any = { black: 0, red: 0, orange: 0, yellow: 0, blue: 0, green: 0 };
      for (const wall of ['midWall', 'overhang', 'sideWall']) {
        const wc = (session.wallCounts as any)[wall];
        for (const color of Object.keys(totalCounts)) {
          totalCounts[color] += wc[color] || 0;
        }
      }
      const score = scoreSession(totalCounts);
      
      // Insert session
      const sessionResult = await client.query(
        'INSERT INTO sessions (climber_id, date, score, notes, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [climberId, session.date, score, session.notes, 'approved']
      );
      const sessionId = sessionResult.rows[0].id;
      
      // Insert wall counts
      for (const wall of ['midWall', 'overhang', 'sideWall']) {
        const counts = (session.wallCounts as any)[wall];
        await client.query(
          'INSERT INTO wall_counts (session_id, wall, green, blue, yellow, orange, red, black) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [sessionId, wall, counts.green, counts.blue, counts.yellow, counts.orange, counts.red, counts.black]
        );
      }
      
      // Insert total counts
      await client.query(
        'INSERT INTO counts (session_id, green, blue, yellow, orange, red, black) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [sessionId, totalCounts.green, totalCounts.blue, totalCounts.yellow, totalCounts.orange, totalCounts.red, totalCounts.black]
      );
      
      sessionCount++;
    }

    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Database wiped and fresh data imported successfully',
      details: {
        climbersCreated: CLIMBERS.length,
        sessionsImported: sessionCount,
        defaultPassword: 'boulder123'
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/climbers {name} (admin only - for adding climbers without accounts)
// POST /api/climbers (admin only)
app.post('/api/climbers', authenticateToken, requireAdmin, async (req: any, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const c = await db.addClimber(name);
    res.json(c);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/climbers
app.get('/api/climbers', async (req, res) => {
  const rows = await db.listClimbers();
  res.json(rows);
});

// POST /api/sessions {climberId, date, counts, wallCounts?, notes}
app.post('/api/sessions', authenticateToken, async (req: any, res) => {
  try {
    const { climberId, date, counts, wallCounts, notes } = req.body;
    if (!climberId || !date) return res.status(400).json({ error: 'climberId and date required' });
    
    let totalCounts: Counts;
    if (wallCounts) {
      // If wall counts provided, validate each wall and combine
      const validatedWalls: WallCounts = {
        overhang: validateCounts(wallCounts.overhang || {}),
        midWall: validateCounts(wallCounts.midWall || {}),
        sideWall: validateCounts(wallCounts.sideWall || {})
      };
      totalCounts = combineCounts(validatedWalls);
      const score = scoreSession(totalCounts);
      const session = { climberId, date, notes: notes || null, score };
      const out = await db.addSession(session as any, totalCounts, validatedWalls);
      res.json({ id: out.id, climberId, date, counts: totalCounts, wallCounts: validatedWalls, score });
    } else {
      // Legacy: flat counts
      totalCounts = validateCounts(counts || {});
      const score = scoreSession(totalCounts);
      const session = { climberId, date, notes: notes || null, score };
      const out = await db.addSession(session as any, totalCounts);
      res.json({ id: out.id, climberId, date, counts: totalCounts, score });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sessions?from=&to=&climberId=
app.get('/api/sessions', async (req, res) => {
  const { from, to, climberId } = req.query as any;
  const rows = await db.getSessions({ from: from as string | undefined, to: to as string | undefined, climberId: climberId ? Number(climberId) : undefined });
  res.json(rows);
});

// GET /api/sessions/:id
app.get('/api/sessions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.getSessionById(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

// GET /api/leaderboard?from=&to=
app.get('/api/leaderboard', async (req, res) => {
  const { from, to } = req.query as any;
  const rows = await db.leaderboard(from as string | undefined, to as string | undefined);
  res.json(rows);
});

// DELETE /api/sessions/:id (admin only)
app.delete('/api/sessions/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.deleteSession(id);
    if (!deleted) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, message: 'Session deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/climbers/:id (admin only)
app.delete('/api/climbers/:id', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.deleteClimber(id);
    if (!deleted) return res.status(404).json({ error: 'Climber not found' });
    res.json({ success: true, message: 'Climber deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos?status=pending|approved|rejected
app.get('/api/videos', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query as any;
    const videos = await db.getVideoReviews(status);
    res.json(videos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:id/vote
app.post('/api/videos/:id/vote', authenticateToken, async (req: any, res) => {
  try {
    const reviewId = Number(req.params.id);
    const { vote } = req.body;
    
    if (vote !== 'up' && vote !== 'down') {
      return res.status(400).json({ error: 'vote must be "up" or "down"' });
    }
    
    const result = await db.voteOnVideo(reviewId, req.user.climberId, vote);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:id/approve (admin only)
app.post('/api/videos/:id/approve', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const reviewId = Number(req.params.id);
    const result = await db.approveVideo(reviewId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:id/reject (admin only)
app.post('/api/videos/:id/reject', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const reviewId = Number(req.params.id);
    const result = await db.rejectVideo(reviewId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
if (require.main === module) {
  db.initDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

export default app;
