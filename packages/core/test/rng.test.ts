import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  createStreams,
  drawFrom,
  nextFloat,
  nextInt,
  nextU32,
  seedRng,
  type RngState,
} from '../src/rng';

/**
 * The seeded PRNG (M1 design §3, #26 AC6): xoshiro128** on four 32-bit words,
 * seeded through SplitMix64 as its authors recommend.
 *
 * The pinned vectors come from the authors' reference C (xoshiro128starstar.c
 * and splitmix64.c), compiled and run on 2026-10-01, never from this module:
 * a vector produced by the code under test could not disagree with it.
 */

function take(state: RngState, n: number): number[] {
  const out: number[] = [];
  let s = state;
  for (let i = 0; i < n; i++) {
    const r = nextU32(s);
    out.push(r.value);
    s = r.state;
  }
  return out;
}

describe('xoshiro128**', () => {
  it('matches the reference C from state {1, 2, 3, 4}', () => {
    expect(take({ s: [1, 2, 3, 4] }, 10)).toEqual([
      11520, 0, 5927040, 70819200, 2031721883, 1637235492, 1287239034,
      3734860849, 3729100597, 4258142804,
    ]);
  });

  it('seeds through SplitMix64: seed 42 gives the reference state and first 8 outputs', () => {
    const state = seedRng(42);
    expect(state).toEqual({
      s: [803958421, 3184996902, 2993090819, 686809907],
    });
    expect(take(state, 8)).toEqual([
      1776835114, 4165204688, 17111135, 2317295270, 2792088233, 2554630222,
      2940343271, 2244566231,
    ]);
  });

  it('never mutates the state it is given', () => {
    const state: RngState = Object.freeze({
      s: Object.freeze([1, 2, 3, 4] as const),
    });
    expect(() => take(state, 5)).not.toThrow();
    expect(state).toEqual({ s: [1, 2, 3, 4] });
  });

  it('round-trips through JSON and continues the same sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 0, max: 50 }),
        (seed, skip) => {
          let s = seedRng(seed);
          for (let i = 0; i < skip; i++) s = nextU32(s).state;
          const revived = JSON.parse(JSON.stringify(s)) as RngState;
          expect(take(revived, 8)).toEqual(take(s, 8));
        },
      ),
    );
  });

  it.each([-1, 1.5, NaN, 2 ** 53])('refuses seed %s', (seed) => {
    expect(() => seedRng(seed)).toThrow(RangeError);
  });

  it('refuses the all-zero state, which xoshiro can never leave', () => {
    expect(() => nextU32({ s: [0, 0, 0, 0] })).toThrow(RangeError);
  });
});

describe('derived draws', () => {
  it('nextFloat is u32 / 2^32, in [0, 1)', () => {
    const s = seedRng(42);
    expect(nextFloat(s).value).toBe(1776835114 / 4294967296);
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e9 }), (seed) => {
        const v = nextFloat(seedRng(seed)).value;
        expect(v >= 0 && v < 1).toBe(true);
      }),
    );
  });

  it('nextInt(n) stays in [0, n) and rejects the biased tail', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e9 }),
        fc.integer({ min: 1, max: 2 ** 32 }),
        (seed, n) => {
          const v = nextInt(seedRng(seed), n).value;
          expect(Number.isInteger(v) && v >= 0 && v < n).toBe(true);
        },
      ),
    );
    // n = 3 * 2^30: the top quarter of u32 values is the biased tail. From
    // state {1, 2, 3, 4} the outputs are 11520, ... so the first is accepted.
    expect(nextInt({ s: [1, 2, 3, 4] }, 3 * 2 ** 30).value).toBe(11520);
    // 3734860849 >= 3 * 2^30 = 3221225472 is rejected and the next output,
    // 3729100597, is rejected too; 4258142804 likewise; the draw moves on.
    let s: RngState = { s: [1, 2, 3, 4] };
    for (let i = 0; i < 7; i++) s = nextU32(s).state;
    const r = nextInt(s, 3 * 2 ** 30);
    expect(r.value).toBeLessThan(3 * 2 ** 30);
    expect(r.state).not.toEqual(nextU32(s).state);
  });

  it.each([0, -1, 1.5, 2 ** 32 + 1])('nextInt refuses n = %s', (n) => {
    expect(() => nextInt(seedRng(1), n)).toThrow(RangeError);
  });
});

describe('named sub-streams', () => {
  const NAMES = ['recall', 'latency', 'opens'];

  it('are reproducible from the seed and distinct from each other', () => {
    const a = createStreams(7, NAMES);
    expect(createStreams(7, NAMES)).toEqual(a);
    const firsts = NAMES.map((n) => drawFrom(a, n).value);
    expect(new Set(firsts).size).toBe(NAMES.length);
    expect(createStreams(8, NAMES)).not.toEqual(a);
  });

  it('are independent: drawing from one never changes another', () => {
    let longest = 0;
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...NAMES), { maxLength: 60, size: 'max' }),
        (order) => {
          longest = Math.max(longest, order.length);
          let streams = createStreams(7, NAMES);
          const seen: Record<string, number[]> = {
            recall: [],
            latency: [],
            opens: [],
          };
          for (const name of order) {
            const r = drawFrom(streams, name);
            seen[name]?.push(r.value);
            streams = r.streams;
          }
          // Each stream's values equal drawing that stream alone, whatever the
          // interleaving with the others.
          for (const name of NAMES) {
            let alone = createStreams(7, NAMES);
            const solo: number[] = [];
            for (let i = 0; i < (seen[name]?.length ?? 0); i++) {
              const r = drawFrom(alone, name);
              solo.push(r.value);
              alone = r.streams;
            }
            expect(seen[name]).toEqual(solo);
          }
        },
      ),
    );
    // fast-check's default size never generates more than 10 elements
    // (measured, #27), whatever maxLength says: the property must reach
    // longer interleavings than that.
    expect(longest).toBeGreaterThan(10);
  });

  it('refuse an unknown name, a duplicate and a name outside [a-z0-9-]', () => {
    expect(() => drawFrom(createStreams(1, NAMES), 'missing')).toThrow(
      RangeError,
    );
    expect(() => createStreams(1, ['a', 'a'])).toThrow(RangeError);
    expect(() => createStreams(1, ['Recall'])).toThrow(RangeError);
  });
});
