import { Climber, Counts, Session, LeaderboardEntry } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function getClimbers(): Promise<Climber[]> {
  const res = await fetch(`${API_BASE}/api/climbers`);
  return res.json();
}

export async function createClimber(name: string): Promise<Climber> {
  const res = await fetch(`${API_BASE}/api/climbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function getSessions(params?: {
  from?: string;
  to?: string;
  climberId?: number;
}): Promise<Session[]> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.climberId) query.set('climberId', String(params.climberId));
  
  const res = await fetch(`${API_BASE}/api/sessions?${query}`);
  return res.json();
}

export async function createSession(data: {
  climberId: number;
  date: string;
  counts: Counts;
  notes?: string;
}): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getLeaderboard(params?: {
  from?: string;
  to?: string;
}): Promise<LeaderboardEntry[]> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  
  const res = await fetch(`${API_BASE}/api/leaderboard?${query}`);
  return res.json();
}
