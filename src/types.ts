/**
 * Type definitions for the BoulderingELO application
 */

export type Color = 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'black';

export type Counts = {
  green: number;
  blue: number;
  yellow: number;
  orange: number;
  red: number;
  black: number;
};

export type WallCounts = {
  overhang: Counts;
  midWall: Counts;
  sideWall: Counts;
  [key: string]: Counts;
};

export type Climber = {
  id?: number;
  name: string;
  username?: string;
  password?: string;
  role?: 'admin' | 'user';
  google_id?: string;
  country?: string;
  started_bouldering?: string;
  bio?: string;
  instagram_handle?: string;
  hidden?: boolean;
  password_changed_at?: Date;
  created_at?: Date;
};

export type PasswordResetToken = {
  id?: number;
  climber_id: number;
  token: string;
  expires_at: Date;
  used: boolean;
  used_at?: Date;
  created_at?: Date;
};

export type Session = {
  id?: number;
  climberId: number;
  date: string;
  score?: number;
  notes?: string;
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: Date;
};

export type VideoReview = {
  id?: number;
  sessionId: number;
  videoUrl: string;
  color: Color;
  wall: string;
  status: 'pending' | 'approved' | 'rejected';
  votes?: Array<{ climberId: number; vote: 'up' | 'down' }>;
  created_at?: Date;
};

export type LeaderboardEntry = {
  climber: string;
  total_score: number;
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Drawing object types for route overlay drawings
export type DrawingCircle = {
  type: 'circle';
  id: string;
  x: number;        // percentage 0-100
  y: number;        // percentage 0-100
  radius: number;   // percentage of image width
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
};

export type DrawingLine = {
  type: 'line';
  id: string;
  x1: number;       // percentage 0-100
  y1: number;       // percentage 0-100
  x2: number;       // percentage 0-100
  y2: number;       // percentage 0-100
  strokeColor: string;
  strokeWidth: number;
};

export type DrawingBrighten = {
  type: 'brighten';
  id: string;
  x: number;        // percentage 0-100
  y: number;        // percentage 0-100
  radius: number;   // percentage of image width
  intensity: number; // 0-1, how much to brighten
};

export type DrawingDarken = {
  type: 'darken';
  id: string;
  x: number;        // percentage 0-100
  y: number;        // percentage 0-100
  radius: number;   // percentage of image width
  intensity: number; // 0-1, how much to darken
};

export type DrawingObject = DrawingCircle | DrawingLine | DrawingBrighten | DrawingDarken;

// Drawings are stored per image index (similar to label_positions)
export type RouteDrawings = Record<number, DrawingObject[]>;

export type Route = {
  id?: number;
  wall_section: string;
  section_number: number;
  global_number: number;
  color: Color;
  position_order: number;
  label_x?: number;
  label_y?: number;
  label_positions?: Record<number, { x: number; y: number }>;
  route_drawings?: RouteDrawings;
  notes?: string;
  dropbox_link?: string;
  active?: boolean;
  created_at?: Date;
  archived_at?: Date;
};

export type RouteCompletion = {
  id?: number;
  session_id: number;
  route_id: number;
  completed_at?: Date;
};

export type RouteSet = {
  id?: number;
  wall_section: string;
  set_date: string;
  removed_date?: string;
  notes?: string;
  created_by?: number;
  created_at?: Date;
};

export type RouteSession = Session & {
  uses_route_tracking: true;
  routes?: Array<Route & { completed_at: Date }>;
};
