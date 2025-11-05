// API client for backend communication
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'boulderingelo_token';
const USER_KEY = 'boulderingelo_user';

export interface Climber {
  id: number;
  name: string;
  username?: string;
  role?: 'admin' | 'user';
  country?: string;
  started_bouldering?: string;
  bio?: string;
}

export interface User {
  climberId: number;
  username: string;
  role: 'admin' | 'user';
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

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): User | null {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === 'admin';
}

// Helper to add timeout to fetch requests
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearToken();
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

function getHeaders(includeAuth: boolean = false): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password })
  });
  return handleResponse<{ token: string; user: User }>(response);
}

export async function register(username: string, password: string, name: string): Promise<{ token: string; user: User }> {
  const response = await fetchWithTimeout(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password, name })
  });
  return handleResponse<{ token: string; user: User }>(response);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function updateUserSettings(settings: { country?: string; started_bouldering?: string; bio?: string }): Promise<{ success: boolean; user: any }> {
  const response = await fetch(`${API_URL}/api/user/settings`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(settings)
  });
  return handleResponse<{ success: boolean; user: any }>(response);
}

export async function mergeKeithAccounts(): Promise<{ success: boolean; message: string; details: any }> {
  const response = await fetch(`${API_URL}/api/admin/merge-keith-accounts`, {
    method: 'POST',
    headers: getHeaders(true)
  });
  return handleResponse<{ success: boolean; message: string; details: any }>(response);
}

export async function resetAndSeed(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/api/admin/reset-and-seed`, {
    method: 'POST',
    headers: getHeaders(true)
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function mergeDuplicateSessions(): Promise<{ success: boolean; message: string; mergedCount: number; deletedCount: number }> {
  const response = await fetch(`${API_URL}/api/admin/merge-duplicates`, {
    method: 'POST',
    headers: getHeaders(true)
  });
  return handleResponse<{ success: boolean; message: string; mergedCount: number; deletedCount: number }>(response);
}

export async function updateClimberProfile(climberId: number, updates: {
  name?: string;
  username?: string;
  country?: string;
  started_bouldering?: string;
  bio?: string;
  role?: string;
}): Promise<{ success: boolean; climber: Climber }> {
  const response = await fetch(`${API_URL}/api/admin/climber/${climberId}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(updates)
  });
  return handleResponse<{ success: boolean; climber: Climber }>(response);
}

export async function addClimber(name: string): Promise<Climber> {
  const response = await fetch(`${API_URL}/api/climbers`, {
    method: 'POST',
    headers: getHeaders(true),
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
    headers: getHeaders(true),
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

export async function deleteClimber(climberId: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/api/climbers/${climberId}`, {
    method: 'DELETE',
    headers: getHeaders(true)
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export async function deleteSession(sessionId: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getHeaders(true)
  });
  return handleResponse<{ success: boolean; message: string }>(response);
}

export interface VideoReview {
  id: number;
  session_id: number;
  climber_name: string;
  video_url: string;
  color: string;
  wall: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: Array<{ user_id: number; vote: 'up' | 'down' }>;
  created_at: string;
  updated_at: string;
}

export async function getVideos(status?: string): Promise<VideoReview[]> {
  try {
    const query = status ? `?status=${status}` : '';
    const response = await fetch(`${API_URL}/api/videos${query}`);
    return handleResponse<VideoReview[]>(response);
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    return [];
  }
}

export async function submitVideo(sessionId: number, videoUrl: string, color: string, wall: string): Promise<VideoReview> {
  const response = await fetch(`${API_URL}/api/videos`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ sessionId, videoUrl, color, wall }),
  });
  return handleResponse<VideoReview>(response);
}

export async function voteOnVideo(videoId: number, vote: 'up' | 'down'): Promise<any> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/vote`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ vote }),
  });
  return handleResponse<any>(response);
}

export async function approveVideo(videoId: number): Promise<any> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/approve`, {
    method: 'POST',
    headers: getHeaders(true),
  });
  return handleResponse<any>(response);
}

export async function rejectVideo(videoId: number): Promise<any> {
  const response = await fetch(`${API_URL}/api/videos/${videoId}/reject`, {
    method: 'POST',
    headers: getHeaders(true),
  });
  return handleResponse<any>(response);
}

// Wall totals configuration
export async function getWallTotals(): Promise<Record<string, Record<string, number>>> {
  const response = await fetch(`${API_URL}/api/settings/wall-totals`);
  const result = await handleResponse<{ data: Record<string, Record<string, number>> }>(response);
  return result.data;
}

export async function saveWallTotals(wallTotals: Record<string, Record<string, number>>): Promise<void> {
  const response = await fetch(`${API_URL}/api/settings/wall-totals`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(wallTotals),
  });
  await handleResponse(response);
}

