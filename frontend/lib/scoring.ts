import { Counts, WallCounts } from './types';

export const BASE: Record<keyof Counts, number> = {
  green: 0.25,
  blue: 0.75,
  yellow: 3.5,
  orange: 12.5,
  red: 56,
  black: 120,
};

export const ORDER: (keyof Counts)[] = ['black', 'red', 'orange', 'yellow', 'blue', 'green'];

export const COLOR_NAMES: Record<keyof Counts, string> = {
  black: 'Black',
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  blue: 'Blue',
  green: 'Green',
};

export function wSum(n: number, r = 0.95): number {
  return n <= 0 ? 0 : (1 - Math.pow(r, n)) / (1 - r);
}

export function scoreSession(counts: Counts, r = 0.95): number {
  let cum = 0;
  let s = 0;
  for (const color of ORDER) {
    const c = counts[color] || 0;
    if (c <= 0) continue;
    s += BASE[color] * (wSum(cum + c, r) - wSum(cum, r));
    cum += c;
  }
  return s;
}

// Calculate marginal gain for adding n more of a color
export function marginalGain(
  counts: Counts,
  color: keyof Counts,
  addCount: number = 1,
  r = 0.95
): number {
  let m = 0;
  for (const c of ORDER) {
    if (c === color) break;
    m += counts[c] || 0;
  }
  m += counts[color] || 0;
  return BASE[color] * Math.pow(r, m) * wSum(addCount, r);
}

export function combineCounts(wallCounts: WallCounts): Counts {
  const total: Counts = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
  for (const wall of ['overhang', 'midWall', 'sideWall'] as const) {
    for (const color of ORDER) {
      total[color] += wallCounts[wall][color] || 0;
    }
  }
  return total;
}
