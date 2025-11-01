import express from 'express';
import bodyParser from 'body-parser';
import * as db from './db';
import { scoreSession, validateCounts } from './score';
import { Counts } from './types';

const app = express();
app.use(bodyParser.json());

// POST /api/climbers {name}
app.post('/api/climbers', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const c = db.addClimber(name);
    res.json(c);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/climbers
app.get('/api/climbers', (req, res) => {
  const rows = db.listClimbers();
  res.json(rows);
});

// POST /api/sessions {climberId, date, counts, notes}
app.post('/api/sessions', (req, res) => {
  try {
    const { climberId, date, counts, notes } = req.body;
    if (!climberId || !date) return res.status(400).json({ error: 'climberId and date required' });
    const c = validateCounts(counts || {});
    const score = scoreSession(c);
    const session = { climberId, date, notes: notes || null, score };
    const out = db.addSession(session as any, c);
    res.json({ id: out.id, climberId, date, counts: c, score });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sessions?from=&to=&climberId=
app.get('/api/sessions', (req, res) => {
  const { from, to, climberId } = req.query as any;
  const rows = db.getSessions({ from: from as string | undefined, to: to as string | undefined, climberId: climberId ? Number(climberId) : undefined });
  res.json(rows);
});

// GET /api/sessions/:id
app.get('/api/sessions/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.getSessionById(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

// GET /api/leaderboard?from=&to=
app.get('/api/leaderboard', (req, res) => {
  const { from, to } = req.query as any;
  const rows = db.leaderboard(from as string | undefined, to as string | undefined);
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

export default app;
