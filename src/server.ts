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
  credentials: true
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
      }
    }
  });
});

// POST /api/auth/login {username, password}
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const climber = await db.getClimberByUsername(username);
    
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
        id: climber.id,
        name: climber.name,
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
    const climber = await db.addClimber(name, username, hashedPassword, 'user');
    
    res.json({ success: true, climber: { id: climber.id, name: climber.name, username: climber.username } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
