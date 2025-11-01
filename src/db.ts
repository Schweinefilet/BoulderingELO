import fs from 'fs';
import path from 'path';
import { Counts, Climber, Session, WallCounts } from './types';

const FILE = process.env.JSON_DB_PATH || path.join(process.cwd(), 'data.json');

type DBShape = {
  climbers: Climber[];
  sessions: Array<Session & { score: number }>;
  counts: Array<{ sessionId: number } & Counts>;
  wallCounts: Array<{ sessionId: number } & WallCounts>;
  lastIds: { climber: number; session: number };
};

function load(): DBShape {
  if (!fs.existsSync(FILE)) {
    const init: DBShape = { climbers: [], sessions: [], counts: [], wallCounts: [], lastIds: { climber: 0, session: 0 } };
    fs.writeFileSync(FILE, JSON.stringify(init, null, 2));
    return init;
  }
  const raw = fs.readFileSync(FILE, 'utf8');
  return JSON.parse(raw) as DBShape;
}

function save(db: DBShape) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function addClimber(name: string) {
  const db = load();
  const existing = db.climbers.find((c) => c.name === name);
  if (existing) return existing;
  const id = ++db.lastIds.climber;
  const c = { id, name };
  db.climbers.push(c);
  save(db);
  return c;
}

export function listClimbers() {
  const db = load();
  return db.climbers.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export function addSession(session: Session & { score: number }, counts: Counts, wallCounts?: WallCounts) {
  const db = load();
  const id = ++db.lastIds.session;
  db.sessions.push({ ...session, id, score: session.score });
  db.counts.push({ sessionId: id, ...counts });
  if (wallCounts) {
    db.wallCounts.push({ sessionId: id, ...wallCounts });
  }
  save(db);
  return { id, ...session };
}

export function getSessions(filter?: { from?: string; to?: string; climberId?: number }) {
  const db = load();
  let rows = db.sessions.map((s) => {
    const baseCounts = db.counts.find((c) => c.sessionId === s.id);
    const walls = db.wallCounts.find((w) => w.sessionId === s.id);
    return {
      ...s,
      ...baseCounts,
      wallCounts: walls || undefined
    };
  });
  if (filter) {
    if (filter.climberId) rows = rows.filter((r) => r.climberId === filter.climberId);
    if (filter.from) rows = rows.filter((r) => new Date(r.date) >= new Date(filter.from!));
    if (filter.to) rows = rows.filter((r) => new Date(r.date) <= new Date(filter.to!));
  }
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

export function getSessionById(id: number) {
  const db = load();
  const s = db.sessions.find((x) => x.id === id);
  if (!s) return null;
  const baseCounts = db.counts.find((c) => c.sessionId === s.id);
  const walls = db.wallCounts.find((w) => w.sessionId === s.id);
  return { ...s, ...baseCounts, wallCounts: walls || undefined };
}

export function leaderboard(from?: string, to?: string) {
  const db = load();
  let rows = db.sessions.slice();
  if (from) rows = rows.filter((r) => new Date(r.date) >= new Date(from));
  if (to) rows = rows.filter((r) => new Date(r.date) <= new Date(to));
  const map = new Map<number, number>();
  for (const s of rows) map.set(s.climberId, (map.get(s.climberId) || 0) + (s.score || 0));
  const out = Array.from(map.entries()).map(([climberId, total_score]) => {
    const c = db.climbers.find((x) => x.id === climberId);
    return { climber: c ? c.name : String(climberId), total_score };
  });
  out.sort((a, b) => b.total_score - a.total_score);
  return out;
}

