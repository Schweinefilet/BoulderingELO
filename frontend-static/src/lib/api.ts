// API client for backend communication
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'boulderingelo_token';
const USER_KEY = 'boulderingelo_user';

export interface Climber {
  id: number;
  name: string;
  username?: string;
  role?: 'admin' | 'user';
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
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
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
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password })
  });
  return handleResponse<{ token: string; user: User }>(response);
}

export async function register(username: string, password: string, name: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, password, name })
  });
  return handleResponse<{ token: string; user: User }>(response);
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
