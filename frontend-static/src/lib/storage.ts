import { Counts, WallCounts, combineCounts } from './scoring';

type Climber = { id:number; name:string };
type Session = { id:number; climberId:number; date:string; notes?:string; score:number; wallCounts?: WallCounts } & Counts;

const KEY = 'boulderingelo_v1';

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { climbers: [] as Climber[], sessions: [] as Session[], lastIds: { climber:0, session:0 } };
  return JSON.parse(raw);
}

function save(db:any) { localStorage.setItem(KEY, JSON.stringify(db)); }

export function addClimber(name:string) {
  const db = load();
  const existing = db.climbers.find((c:any)=>c.name===name);
  if (existing) return existing;
  const id = ++db.lastIds.climber;
  const c = { id, name };
  db.climbers.push(c);
  save(db);
  return c;
}

export function listClimbers() { const db=load(); return db.climbers.slice().sort((a:any,b:any)=>a.name.localeCompare(b.name)); }

export function addSession(session: {climberId:number; date:string; notes?:string; score:number}, counts: Counts, wallCounts?: WallCounts) {
  const db = load();
  const id = ++db.lastIds.session;
  const s = { id, ...session, ...counts, wallCounts: wallCounts || undefined };
  db.sessions.push(s);
  save(db);
  return s;
}

export function getSessions() { const db=load(); return [...db.sessions]; }

export function leaderboard(from?:string, to?:string) {
  const db = load();
  let rows = [...db.sessions];
  if (from) rows = rows.filter((r:any)=> new Date(r.date) >= new Date(from));
  if (to) rows = rows.filter((r:any)=> new Date(r.date) <= new Date(to));
  
  // Get the latest session for each climber
  const latestByClimber = new Map<number, Session>();
  for (const s of rows) {
    const existing = latestByClimber.get(s.climberId);
    if (!existing || new Date(s.date) > new Date(existing.date)) {
      latestByClimber.set(s.climberId, s);
    }
  }
  
  return Array.from(latestByClimber.entries())
    .map(([climberId, session]) => ({ 
      climber: db.climbers.find((c:any)=>c.id===climberId)?.name || String(climberId), 
      total_score: session.score 
    }))
    .sort((a:any,b:any)=>b.total_score-a.total_score);
}

export function exportCSV() {
  const db = load();
  const lines = ['type,id,name,climberId,date,notes,green,blue,yellow,orange,red,black,score'];
  for (const c of db.climbers) lines.push(["climber",c.id,c.name,"","","","","","","","",""].join(','));
  for (const s of db.sessions) lines.push(["session",s.id,"",s.climberId,s.date,s.notes||"",s.green,s.blue,s.yellow,s.orange,s.red,s.black,s.score].join(','));
  return lines.join('\n');
}

export function importFromJSON(jsonStr:string) { try{ const parsed = JSON.parse(jsonStr); localStorage.setItem(KEY, JSON.stringify(parsed)); return true;}catch(e){return false;} }

export function clearAll(){ localStorage.removeItem(KEY); }
