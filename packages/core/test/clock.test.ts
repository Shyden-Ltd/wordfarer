import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  bucketEnd,
  bucketStart,
  gridTicksBetween,
  HOUR_MS,
  nextGridTick,
  simMs,
  wallMs,
  type SimMs,
  type WallMs,
} from '../src/clock';

/**
 * The integer-millisecond clocks (M1 design §2.2 and §2.3, #26 AC5).
 *
 * Every time in core is a safe non-negative integer count of milliseconds, so
 * no split of an interval can round differently from the whole. The bucket
 * and grid helpers are checked against BigInt arithmetic, which is exact at
 * every magnitude.
 */

const safeTime = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });
const interval = fc.integer({ min: 1, max: 86_400_000 });

describe('the SimMs and WallMs brands', () => {
  it.each([0, 1, 3_600_000, Number.MAX_SAFE_INTEGER])('accept %s', (n) => {
    expect(simMs(n)).toBe(n);
    expect(wallMs(n)).toBe(n);
  });

  it.each([
    1.5,
    -1,
    NaN,
    Infinity,
    -Infinity,
    2 ** 53,
    Number.MAX_SAFE_INTEGER + 2,
  ])('refuse %s', (n) => {
    expect(() => simMs(n)).toThrow(RangeError);
    expect(() => wallMs(n)).toThrow(RangeError);
  });

  it('store -0 as 0, so state never holds a zero that JSON cannot round-trip', () => {
    expect(Object.is(simMs(-0), 0)).toBe(true);
    expect(Object.is(wallMs(-0), 0)).toBe(true);
  });

  it('cannot be mixed up or made from a bare number (typecheck)', () => {
    const sim: SimMs = simMs(5);
    const wall: WallMs = wallMs(5);
    // @ts-expect-error a bare number is not a SimMs
    const fromNumber: SimMs = 5;
    // @ts-expect-error a WallMs is not a SimMs
    const crossed: SimMs = wall;
    // @ts-expect-error a SimMs is not a WallMs
    const crossedBack: WallMs = sim;
    expect([fromNumber, crossed, crossedBack]).toEqual([5, 5, 5]);
  });
});

describe('hour buckets', () => {
  it('are one clock hour long', () => {
    expect(HOUR_MS).toBe(3_600_000);
  });

  it.each([
    [0, 0, 3_600_000],
    [1, 0, 3_600_000],
    [3_599_999, 0, 3_600_000],
    [3_600_000, 3_600_000, 7_200_000],
    [3_600_001, 3_600_000, 7_200_000],
  ])('place %s in [%s, %s)', (t, start, end) => {
    expect(bucketStart(simMs(t))).toBe(start);
    expect(bucketEnd(simMs(t))).toBe(end);
  });

  it('agree with exact BigInt arithmetic at every magnitude', () => {
    const H = BigInt(HOUR_MS);
    fc.assert(
      fc.property(safeTime, (t) => {
        const start = BigInt(t) - (BigInt(t) % H);
        expect(BigInt(bucketStart(simMs(t)))).toBe(start);
        if (start + H <= BigInt(Number.MAX_SAFE_INTEGER)) {
          expect(BigInt(bucketEnd(simMs(t)))).toBe(start + H);
        }
      }),
      { numRuns: 5000 },
    );
  });

  it('refuse a bucket end past the safe range', () => {
    expect(() => bucketEnd(simMs(Number.MAX_SAFE_INTEGER))).toThrow(RangeError);
  });
});

describe('the automation grid', () => {
  it.each([
    [0, 10_000, 10_000],
    [9_999, 10_000, 10_000],
    [10_000, 10_000, 20_000],
    [10_001, 1_000, 11_000],
  ])('the next tick after %s on a %s ms grid is %s', (t, step, next) => {
    expect(nextGridTick(simMs(t), step)).toBe(next);
  });

  it.each([
    [0, 10_000, 1],
    [0, 9_999, 0],
    [10_000, 10_000, 0],
    [9_999, 10_000, 1],
    [0, 3_600_000, 360],
  ])('counts ticks in (%s, %s] on a 10 s grid as %s', (from, to, n) => {
    expect(gridTicksBetween(simMs(from), simMs(to), 10_000)).toBe(n);
  });

  it('splits exactly: ticks(a, b) + ticks(b, c) = ticks(a, c)', () => {
    fc.assert(
      fc.property(
        fc.array(safeTime, { minLength: 3, maxLength: 3 }),
        interval,
        (ts, step) => {
          const [a, b, c] = [...ts].sort((x, y) => x - y).map(simMs) as [
            SimMs,
            SimMs,
            SimMs,
          ];
          expect(
            gridTicksBetween(a, b, step) + gridTicksBetween(b, c, step),
          ).toBe(gridTicksBetween(a, c, step));
          const exact = BigInt(c) / BigInt(step) - BigInt(a) / BigInt(step);
          expect(BigInt(gridTicksBetween(a, c, step))).toBe(exact);
        },
      ),
      { numRuns: 5000 },
    );
  });

  it.each([0, -1, 1.5, NaN])('refuses a %s ms interval', (step) => {
    expect(() => nextGridTick(simMs(0), step)).toThrow(RangeError);
    expect(() => gridTicksBetween(simMs(0), simMs(1), step)).toThrow(
      RangeError,
    );
  });

  it('refuses a backwards span', () => {
    expect(() => gridTicksBetween(simMs(2), simMs(1), 1_000)).toThrow(
      RangeError,
    );
  });
});
