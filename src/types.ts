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
