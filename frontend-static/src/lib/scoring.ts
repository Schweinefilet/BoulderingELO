export type Counts = { green:number; blue:number; yellow:number; orange:number; red:number; black:number };
export type WallCounts = { [section: string]: Counts };

export const BASE: Record<keyof Counts, number> = {
  green:0.5, blue:1.5, yellow:4, orange:12, red:36, black:108
};
export const ORDER: (keyof Counts)[] = ["black","red","orange","yellow","blue","green"];

const DEFAULT_RATIO = 0.95;

export function wSum(n: number, r = DEFAULT_RATIO): number {
  return n <= 0 ? 0 : (1 - Math.pow(r, n)) / (1 - r);
}

export function computeWeeklyScore(counts: Counts, r = DEFAULT_RATIO): number {
  let cum = 0; let s = 0;
  for (const color of ORDER) {
    const c = (counts as any)[color] || 0;
    if (c <= 0) continue;
    s += BASE[color] * (wSum(cum + c, r) - wSum(cum, r));
    cum += c;
  }
  return s;
}

export function marginalGain(counts: Counts, color: keyof Counts, addCount = 1, r = 0.95) {
  let m = 0;
  for (const c of ORDER) {
    if (c === color) break;
    m += (counts as any)[c] || 0;
  }
  m += (counts as any)[color] || 0;
  return BASE[color] * Math.pow(r, m) * wSum(addCount, r);
}

export function combineCounts(wallCounts: WallCounts): Counts {
  const total: Counts = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
  for (const wall of Object.keys(wallCounts)) {
    for (const color of ORDER) {
      total[color] += (wallCounts[wall] as any)[color] || 0;
    }
  }
  return total;
}

export type Grade = 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9+';

export const GRADE_BOUNDS: Array<{ grade: Grade; min: number; max?: number }> = [
  { grade: 'V0', min: 0, max: 3 },
  { grade: 'V1', min: 3, max: 6 },
  { grade: 'V2', min: 6, max: 19 },
  { grade: 'V3', min: 19, max: 45 },
  { grade: 'V4', min: 45, max: 70 },
  { grade: 'V5', min: 70, max: 106 },
  { grade: 'V6', min: 106, max: 186 },
  { grade: 'V7', min: 186, max: 297 },
  { grade: 'V8', min: 297, max: 420 },
  { grade: 'V9+', min: 420 }
];

export function getGradeForScore(score: number): Grade {
  for (const bound of GRADE_BOUNDS) {
    if (bound.max == null && score >= bound.min) return bound.grade;
    if (bound.max != null && score >= bound.min && score < bound.max) return bound.grade;
  }
  return 'V0';
}

export const GRADE_COLORS: Record<Grade, { backgroundColor: string; textColor: string }> = {
  V0: { backgroundColor: '#E0E0E0', textColor: '#202020' },
  V1: { backgroundColor: '#A5D6A7', textColor: '#103820' },
  V2: { backgroundColor: '#80CBC4', textColor: '#003535' },
  V3: { backgroundColor: '#64B5F6', textColor: '#0A2470' },
  V4: { backgroundColor: '#4FC3F7', textColor: '#033C5A' },
  V5: { backgroundColor: '#FFD54F', textColor: '#5A3B00' },
  V6: { backgroundColor: '#FFB74D', textColor: '#5A2A00' },
  V7: { backgroundColor: '#FF8A65', textColor: '#5A1500' },
  V8: { backgroundColor: '#F06292', textColor: '#4A0620' },
  'V9+': { backgroundColor: '#BA68C8', textColor: '#2F0038' }
};

export function getGradeColor(grade: Grade) {
  return GRADE_COLORS[grade];
}
