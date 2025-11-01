import { Counts, WallCounts } from './types';

export const BASE: Record<keyof Counts, number> = {
  green: 0.25,
  blue: 0.75,
  yellow: 3.5,
  orange: 12.5,
  red: 56,
  black: 120
};

export const ORDER: (keyof Counts)[] = ['black', 'red', 'orange', 'yellow', 'blue', 'green'];

export function wSum(n: number, r = 0.95): number {
  return n <= 0 ? 0 : (1 - Math.pow(r, n)) / (1 - r);
}

export function scoreSession(counts: Counts, r = 0.95): number {
  let cum = 0;
  let s = 0;
  for (const color of ORDER) {
    const c = (counts[color] || 0) as number;
    if (c <= 0) continue;
    s += BASE[color] * (wSum(cum + c, r) - wSum(cum, r));
    cum += c;
  }
  return s;
}

export function validateCounts(counts: Partial<Counts>): Counts {
  const out: Counts = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
  for (const k of Object.keys(out) as Array<keyof Counts>) {
    const v = counts[k];
    if (v == null) out[k] = 0;
    else if (!Number.isInteger(v) || v < 0) throw new Error(`Invalid count for ${k}`);
    else out[k] = v;
  }
  return out;
}

// Combine wall counts into total counts
export function combineCounts(wallCounts: WallCounts): Counts {
  const total: Counts = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
  for (const wall of ['overhang', 'midWall', 'sideWall'] as const) {
    for (const color of ORDER) {
      total[color] += wallCounts[wall][color] || 0;
    }
  }
  return total;
}
