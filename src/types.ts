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
  id?: number;
  name: string;
  username?: string;
  password?: string;
  role?: string;
  country?: string;
  started_bouldering?: string;
  bio?: string;
};

export type Session = { id?: number; climberId: number; date: string; notes?: string; status?: string };
