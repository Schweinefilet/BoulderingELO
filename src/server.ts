import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import * as db from './db';
import { scoreSession, validateCounts, combineCounts } from './score';
import { Counts, WallCounts } from './types';

const app = express();

// JWT Secret (set in environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const APP_PASSWORD = process.env.APP_PASSWORD || 'climbing123';

// CORS configuration - allow GitHub Pages
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://schweinefilet.github.io'
  ],
  credentials: true
}));

app.use(bodyParser.json());

// Middleware to verify JWT token
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'BoulderingELO API',
    endpoints: {
      auth: {
        post: '/api/auth/login'
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
      }
    }
  });
});

// POST /api/auth/login {password}
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  
  if (password === APP_PASSWORD) {
    const token = jwt.sign({ authorized: true }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// POST /api/climbers {name}
app.post('/api/climbers', authenticateToken, async (req, res) => {
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
app.post('/api/sessions', authenticateToken, async (req, res) => {
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

// DELETE /api/sessions/:id
app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.deleteSession(id);
    if (!deleted) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, message: 'Session deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/climbers/:id
app.delete('/api/climbers/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.deleteClimber(id);
    if (!deleted) return res.status(404).json({ error: 'Climber not found' });
    res.json({ success: true, message: 'Climber deleted' });
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
