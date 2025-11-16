import {
  computeWeeklyScore,
  wSum,
  BASE,
  getGradeForScore,
  getGradeColor
} from '../src/score';

describe('wSum', () => {
  test('wSum 0', () => expect(wSum(0)).toBe(0));
  test('wSum 1', () => expect(wSum(1)).toBeCloseTo(1));
});

describe('computeWeeklyScore', () => {
  test('empty counts -> 0', () => {
    expect(computeWeeklyScore({ green:0,blue:0,yellow:0,orange:0,red:0,black:0 })).toBe(0);
  });

  test('single yellow equals base value', () => {
    expect(computeWeeklyScore({ green:0,blue:0,yellow:1,orange:0,red:0,black:0 })).toBeCloseTo(BASE.yellow, 10);
  });

  test('two yellows include decay', () => {
    const s = computeWeeklyScore({ green:0,blue:0,yellow:2,orange:0,red:0,black:0 });
    expect(s).toBeCloseTo(BASE.yellow * (1 + 0.95), 10);
  });

  test('one orange then one yellow', () => {
    const s = computeWeeklyScore({ green:0,blue:0,yellow:1,orange:1,red:0,black:0 });
    expect(s).toBeCloseTo(12 + 4 * 0.95, 8);
  });

  test('one red, one orange, one yellow', () => {
    const s = computeWeeklyScore({ green:0,blue:0,yellow:1,orange:1,red:1,black:0 });
    expect(s).toBeCloseTo(36 + 12 * 0.95 + 4 * Math.pow(0.95, 2), 8);
  });

  test('easy volume (green + blue) matches expected total', () => {
    const s = computeWeeklyScore({ green:5, blue:3, yellow:0, orange:0, red:0, black:0 });
    expect(s).toBeCloseTo(6.2182956871, 8);
  });

  test('mixed yellow and orange climbs', () => {
    const s = computeWeeklyScore({ green:0, blue:0, yellow:4, orange:2, red:0, black:0 });
    expect(s).toBeCloseTo(36.79264875, 8);
  });

  test('red and black sends spike the score', () => {
    const s = computeWeeklyScore({ green:0, blue:0, yellow:0, orange:0, red:2, black:1 });
    expect(s).toBeCloseTo(174.69, 5);
  });
});

describe('grades', () => {
  const gradeCases: Array<[number, string]> = [
    [2, 'V0'],
    [3, 'V1'],
    [5, 'V1'],
    [6, 'V2'],
    [18, 'V2'],
    [19, 'V3'],
    [44, 'V3'],
    [45, 'V4'],
    [69, 'V4'],
    [70, 'V5'],
    [105, 'V5'],
    [106, 'V6'],
    [185, 'V6'],
    [186, 'V7'],
    [296, 'V7'],
    [297, 'V8'],
    [419, 'V8'],
    [420, 'V9+']
  ];

  test.each(gradeCases)('score %d → %s', (score, expected) => {
    expect(getGradeForScore(score)).toBe(expected as any);
  });

  test('grade colors remain stable', () => {
    expect(getGradeColor('V5')).toEqual({ backgroundColor: '#FFD54F', textColor: '#5A3B00' });
  });
});
