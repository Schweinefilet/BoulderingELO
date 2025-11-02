import { Climber, Counts, Session, LeaderboardEntry } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API Error: ${res.status} - ${error}`);
  }
  return res.json();
}

export async function getClimbers(): Promise<Climber[]> {
  try {
    const res = await fetch(`${API_BASE}/api/climbers`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Failed to fetch climbers:', error);
    return [];
  }
}

export async function createClimber(name: string): Promise<Climber> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}/api/climbers`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function getSessions(params?: {
  from?: string;
  to?: string;
  climberId?: number;
}): Promise<Session[]> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.climberId) query.set('climberId', String(params.climberId));
    
    const res = await fetch(`${API_BASE}/api/sessions?${query}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return [];
  }
}

export async function createSession(data: {
  climberId: number;
  date: string;
  counts?: Counts;
  wallCounts?: any;
  notes?: string;
}): Promise<Session> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getLeaderboard(params?: {
  from?: string;
  to?: string;
}): Promise<LeaderboardEntry[]> {
  try {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    
    const res = await fetch(`${API_BASE}/api/leaderboard?${query}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
}

export async function getVideos(status?: string): Promise<any[]> {
  try {
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE}/api/videos${query}`, {
      headers: { 'Accept': 'application/json' }
    });
    return handleResponse(res);
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    return [];
  }
}

export async function voteOnVideo(videoId: number, vote: 'up' | 'down'): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/vote`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ vote }),
  });
  return handleResponse(res);
}

export async function approveVideo(videoId: number): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/approve`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
  });
  return handleResponse(res);
}

export async function rejectVideo(videoId: number): Promise<any> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/reject`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
  });
  return handleResponse(res);
}
