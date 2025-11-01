export type Counts = {
  green: number;
  blue: number;
  yellow: number;
  orange: number;
  red: number;
  black: number;
};

export type Climber = { id?: number; name: string };

export type Session = { id?: number; climberId: number; date: string; notes?: string };
