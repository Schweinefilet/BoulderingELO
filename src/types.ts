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

export type Route = {
  id?: number;
  wall_section: string;
  section_number: number;
  global_number: number;
  color: Color;
  position_order: number;
  label_x?: number;
  label_y?: number;
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
