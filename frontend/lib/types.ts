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
};

export type Climber = {
  id: number;
  name: string;
};

export type Session = {
  id: number;
  climberId: number;
  date: string;
  notes?: string;
  score: number;
  green: number;
  blue: number;
  yellow: number;
  orange: number;
  red: number;
  black: number;
  wallCounts?: WallCounts;
};

export type LeaderboardEntry = {
  climber: string;
  total_score: number;
};

export type VideoReview = {
  id: number;
  session_id: number;
  video_url: string;
  color: string;
  wall: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: { climberId: number; vote: 'up' | 'down' }[];
  created_at: string;
  climber_id: number;
  climber_name: string;
  date: string;
};
