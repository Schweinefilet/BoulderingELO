// API client for backend communication
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export interface Climber {
  id: number;
  name: string;
}

export interface Session {
  id: number;
  climberId: number;
  date: string;
  score: number;
  notes?: string;
  green: number;
  blue: number;
  yellow: number;
  orange: number;
  red: number;
  black: number;
  wallCounts?: any;
}

export interface LeaderboardEntry {
  climber: string;
  total_score: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function addClimber(name: string): Promise<Climber> {
  const response = await fetch(`${API_URL}/api/climbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return handleResponse<Climber>(response);
}

export async function getClimbers(): Promise<Climber[]> {
  const response = await fetch(`${API_URL}/api/climbers`);
  return handleResponse<Climber[]>(response);
}

export async function addSession(data: {
  climberId: number;
  date: string;
  wallCounts: any;
  notes?: string;
}): Promise<Session> {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse<Session>(response);
}

export async function getSessions(): Promise<Session[]> {
  const response = await fetch(`${API_URL}/api/sessions`);
  return handleResponse<Session[]>(response);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(`${API_URL}/api/leaderboard`);
  return handleResponse<LeaderboardEntry[]>(response);
}
