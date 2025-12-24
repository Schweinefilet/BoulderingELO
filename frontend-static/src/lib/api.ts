// API client for backend communication
// Default to the hosted API so local dev/test hits the live backend unless overridden
export const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://bouldering-elo-api.onrender.com';

const TOKEN_KEY = 'boulderingelo_token';
const USER_KEY = 'boulderingelo_user';

export class ApiBootingError extends Error {
  constructor(message = 'API is still starting on Render') {
    super(message);
    this.name = 'ApiBootingError';
  }
}

const RENDER_BOOT_MARKERS = [
  'please wait up to 50 seconds',
  'your service is starting',
  'render will keep trying'
];

const looksLikeRenderBootResponse = (text: string | null | undefined) => {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return RENDER_BOOT_MARKERS.some(marker => normalized.includes(marker));
};

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isBootingError(error: unknown): error is ApiBootingError {
  if (error instanceof ApiBootingError) return true;
  if (!error || typeof error !== 'object') return false;
  const message = (error as any).message;
  return typeof message === 'string' && /render|boot|starting|warming/i.test(message);
}

export interface Climber {
  id: number;
  name: string;
  username?: string;
  role?: 'admin' | 'user';
  country?: string;
  started_bouldering?: string;
  bio?: string;
  instagram_handle?: string;
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
  uses_route_tracking?: boolean;
  routes?: any[];
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
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  const isJsonResponse = contentType.includes('application/json');

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearToken();
      throw new Error('Authentication required');
    }

    if (response.status === 502 || response.status === 503) {
      throw new ApiBootingError();
    }

    if (isJsonResponse) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    const text = await response.text().catch(() => '');
    if (looksLikeRenderBootResponse(text)) {
      throw new ApiBootingError();
    }
    throw new Error(text || 'Request failed');
  }

  if (!isJsonResponse) {
    const text = await response.text().catch(() => '');
    if (looksLikeRenderBootResponse(text)) {
      throw new ApiBootingError();
    }
    throw new Error('Unexpected response from server. Please try again.');
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

export async function googleLogin(credential: string, customName?: string, customUsername?: string): Promise<{ token: string; user: User }> {
  const response = await fetchWithTimeout(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ credential, customName, customUsername })
  });
  return handleResponse<{ token: string; user: User }>(response);
}

export async function getGoogleConfig(): Promise<{ enabled: boolean; clientId?: string | null }> {
  const response = await fetch(`${API_URL}/api/auth/google-config`);
  return handleResponse<{ enabled: boolean; clientId?: string | null }>(response);
}

export async function linkGoogleAccount(credential: string): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithTimeout(`${API_URL}/api/auth/link-google`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ credential })
  });
  return handleResponse<{ success: boolean; message: string }>(response);
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

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email })
    });
    return handleResponse<{ message: string }>(response);
  } catch (err) {
    // Return generic success message to avoid revealing account existence
    return { message: 'If that email is registered, a password reset link has been sent.' };
  }
}

export async function validateResetToken(token: string): Promise<{ valid: boolean }> {
  const response = await fetch(`${API_URL}/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
  return handleResponse<{ valid: boolean }>(response);
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ token, newPassword })
  });
  return handleResponse<{ message: string }>(response);
}

export async function updateUserSettings(settings: { username?: string; name?: string; country?: string; started_bouldering?: string; bio?: string; instagram_handle?: string }): Promise<{ success: boolean; user: any }> {
  const response = await fetch(`${API_URL}/api/user/settings`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(settings)
  });
  return handleResponse<{ success: boolean; user: any }>(response);
}

export async function deleteAccount(): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/api/user/delete`, {
    method: 'DELETE',
    headers: getHeaders(true)
  });
  return handleResponse<{ success: boolean; message: string }>(response);
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

export async function recalculateScores(): Promise<{ message: string; sessionsProcessed: number; scoresChanged?: number }> {
  const response = await fetch(`${API_URL}/api/admin/recalculate-scores`, {
    method: 'POST',
    headers: getHeaders(true)
  });
  return handleResponse<{ message: string; sessionsProcessed: number; scoresChanged?: number }>(response);
}

// Reset a wall section (admin only). Returns list of affected sessions and a message.
export async function resetWallSection(wall: string): Promise<{ changed: Array<any>; message: string }> {
  const response = await fetch(`${API_URL}/api/admin/reset-wall`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ wall })
  });
  return handleResponse<{ changed: Array<any>; message: string; auditId?: string }>(response);
}

export async function undoResetWallSection(auditId?: string, wall?: string): Promise<{ message: string; auditId?: string }> {
  const response = await fetch(`${API_URL}/api/admin/reset-wall/undo`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ auditId, wall })
  });
  return handleResponse<{ message: string; auditId?: string }>(response);
}

export async function getResetAudits(): Promise<{ audits: Array<any> }> {
  const response = await fetch(`${API_URL}/api/admin/reset-audits`, {
    method: 'GET',
    headers: getHeaders(true)
  });
  return handleResponse<{ audits: Array<any> }>(response);
}

export async function getAdminNotifications(): Promise<{ notifications: Array<any> }> {
  const response = await fetch(`${API_URL}/api/admin/notifications`);
  return handleResponse<{ notifications: Array<any> }>(response);
}

export async function setAdminNotification(message: string): Promise<{ notification: any }> {
  const response = await fetch(`${API_URL}/api/admin/notifications`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ message })
  });
  return handleResponse<{ notification: any }>(response);
}

export async function updateClimberProfile(climberId: number, updates: {
  name?: string;
  username?: string;
  country?: string;
  started_bouldering?: string;
  bio?: string;
  instagram_handle?: string;
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

// Wall section images configuration
export async function getWallSectionImages(): Promise<Record<string, string | string[]>> {
  const response = await fetch(`${API_URL}/api/settings/wall-section-images`);
  const result = await handleResponse<{ data: Record<string, string | string[]> }>(response);
  return result.data || {};
}

export async function saveWallSectionImages(wallSectionImages: Record<string, string[]>): Promise<void> {
  const response = await fetch(`${API_URL}/api/settings/wall-section-images`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(wallSectionImages),
  });
  await handleResponse(response);
}

// Route management

// Drawing object types for route overlay drawings
export interface DrawingCircle {
  type: 'circle';
  id: string;
  x: number;        // percentage 0-100
  y: number;        // percentage 0-100
  radius: number;   // percentage of image width
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
}

export interface DrawingLine {
  type: 'line';
  id: string;
  x1: number;       // percentage 0-100
  y1: number;       // percentage 0-100
  x2: number;       // percentage 0-100
  y2: number;       // percentage 0-100
  strokeColor: string;
  strokeWidth: number;
}

export interface DrawingBrighten {
  type: 'brighten';
  id: string;
  x: number;        // percentage 0-100
  y: number;        // percentage 0-100
  radius: number;   // percentage of image width
  intensity: number; // 0-1, how much to brighten
}

export interface DrawingDarken {
  type: 'darken';
  id: string;
  x: number;        // percentage 0-100
  y: number;        // percentage 0-100
  radius: number;   // percentage of image width
  intensity: number; // 0-1, how much to darken
}

export type DrawingObject = DrawingCircle | DrawingLine | DrawingBrighten | DrawingDarken;

// Drawings are stored per image index (similar to label_positions)
export type RouteDrawings = Record<number, DrawingObject[]>;

export interface Route {
  id: number;
  wall_section: string;
  section_number: number;
  global_number: number;
  color: string;
  position_order: number;
  label_x?: number | null;
  label_y?: number | null;
  label_positions?: Record<number, { x: number; y: number }> | null;
  route_drawings?: RouteDrawings | null;
  notes?: string;
  dropbox_link?: string;
  active: boolean;
  created_at?: string;
  archived_at?: string;
}

export async function getRoutes(filter?: { wall_section?: string; color?: string; active?: boolean }): Promise<Route[]> {
  const params = new URLSearchParams();
  if (filter?.wall_section) params.append('wall_section', filter.wall_section);
  if (filter?.color) params.append('color', filter.color);
  if (filter?.active !== undefined) params.append('active', filter.active.toString());

  const response = await fetch(`${API_URL}/api/routes?${params.toString()}`);
  const result = await handleResponse<{ data: Route[] }>(response);
  return result.data || [];
}

export async function getRoute(id: number): Promise<Route> {
  const response = await fetch(`${API_URL}/api/routes/${id}`);
  const result = await handleResponse<{ data: Route }>(response);
  return result.data;
}

export async function createRoute(route: {
  wall_section: string;
  color: string;
  section_number?: number;
  position_order?: number;
  label_x?: number;
  label_y?: number;
  label_positions?: Record<number, { x: number; y: number }>;
  notes?: string;
  dropbox_link?: string;
}): Promise<Route> {
  const response = await fetch(`${API_URL}/api/routes`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(route),
  });
  const result = await handleResponse<{ data: Route }>(response);
  return result.data;
}

export async function updateRoute(id: number, updates: {
  section_number?: number;
  color?: string;
  position_order?: number;
  label_x?: number | null;
  label_y?: number | null;
  label_positions?: Record<number, { x: number; y: number }> | null;
  route_drawings?: RouteDrawings | null;
  notes?: string;
  dropbox_link?: string;
}): Promise<Route> {
  const response = await fetch(`${API_URL}/api/routes/${id}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(updates),
  });
  const result = await handleResponse<{ data: Route }>(response);
  return result.data;
}

export async function deleteRoute(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/routes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  await handleResponse(response);
}

export async function bulkImportRoutes(): Promise<{ message: string; routes: Route[] }> {
  const response = await fetchWithTimeout(`${API_URL}/api/routes/bulk-import`, {
    method: 'POST',
    headers: getHeaders(true),
  });
  const result = await handleResponse<{ message: string; routes: Route[] }>(response);
  return result;
}

export async function deleteAllRoutes(): Promise<{ message: string; deletedCount: number }> {
  const response = await fetchWithTimeout(`${API_URL}/api/routes/all/delete-all`, {
    method: 'DELETE',
    headers: getHeaders(true),
  });
  const result = await handleResponse<{ message: string; deletedCount: number }>(response);
  return result;
}

export async function createRouteSession(data: {
  climberId: number;
  date: string;
  routeIds: number[];
  notes?: string;
}): Promise<any> {
  const response = await fetch(`${API_URL}/api/sessions/routes`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(data),
  });
  const result = await handleResponse<{ data: any }>(response);
  return result.data;
}

export async function getSessionRoutes(sessionId: number): Promise<any[]> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/routes`);
  const result = await handleResponse<{ data: any[] }>(response);
  return result.data || [];
}
