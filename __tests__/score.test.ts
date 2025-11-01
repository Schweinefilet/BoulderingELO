import { scoreSession, wSum, BASE } from '../src/score';

describe('wSum', () => {
  test('wSum 0', () => expect(wSum(0)).toBe(0));
  test('wSum 1', () => expect(wSum(1)).toBeCloseTo(1));
});

describe('scoreSession', () => {
  test('empty counts -> 0', () => {
    expect(scoreSession({ green:0,blue:0,yellow:0,orange:0,red:0,black:0 })).toBe(0);
  });

  test('single yellow', () => {
    expect(scoreSession({ green:0,blue:0,yellow:1,orange:0,red:0,black:0 })).toBeCloseTo(BASE.yellow, 10);
  });

  test('two yellows', () => {
    const s = scoreSession({ green:0,blue:0,yellow:2,orange:0,red:0,black:0 });
    expect(s).toBeCloseTo(BASE.yellow * (1 + 0.95), 10);
  });

  test('one orange then one yellow', () => {
    const s = scoreSession({ green:0,blue:0,yellow:1,orange:1,red:0,black:0 });
    expect(s).toBeCloseTo(12 + 3.5 * 0.95, 8);
  });

  test("one red, one orange, one yellow", () => {
    const s = scoreSession({ green:0,blue:0,yellow:1,orange:1,red:1,black:0 });
    expect(s).toBeCloseTo(48 + 12 * 0.95 + 3.5 * Math.pow(0.95, 2), 8);
  });

  test('Keith Oct 29: 15 Yellow -> 37.5696', () => {
    const s = scoreSession({ green:0,blue:0,yellow:15,orange:0,red:0,black:0 });
    expect(s).toBeCloseTo(37.5696, 4);
  });

  test('Keith Oct 31: 1 Orange + 18 Yellow -> 52.0852', () => {
    const s = scoreSession({ green:0,blue:0,yellow:18,orange:1,red:0,black:0 });
    expect(s).toBeCloseTo(52.0852, 4);
  });
});
