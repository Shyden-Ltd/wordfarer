import { exp, expm1, ln, log10, log1p, pow } from '../src/det-math';
import { nextU32, seedRng, type RngState } from '../src/rng';

/**
 * det-math golden vectors (#26 AC10): 100,000 inputs per function, generated
 * from a fixed seed, hashed over the exact bits of every result.
 *
 * The same module runs under Node (a unit test pins its digests) and, bundled,
 * in Chromium, WebKit and Firefox (tests/engines). Equal digests mean equal
 * bits on every engine. The inputs and the hash use only integer operations,
 * division by 2^32 and little-endian DataView access, which every engine
 * computes alike, so any difference is det-math's.
 */

export const VECTORS_PER_FUNCTION = 100_000;

export const FUNCTIONS = [
  'pow',
  'exp',
  'ln',
  'log10',
  'expm1',
  'log1p',
] as const;
export type GoldenFunction = (typeof FUNCTIONS)[number];

const TWO_POW_32 = 4294967296;

class Inputs {
  private state: RngState;
  private readonly view = new DataView(new ArrayBuffer(8));

  constructor(seed: number) {
    this.state = seedRng(seed);
  }

  u32(): number {
    const r = nextU32(this.state);
    this.state = r.state;
    return r.value;
  }

  /** A uniform float in [0, 1). */
  unit(): number {
    return this.u32() / TWO_POW_32;
  }

  /**
   * A non-negative finite double with a uniformly random exponent field
   * (0 to 2046: subnormals through the largest finite), so every magnitude
   * is drawn.
   */
  anyPositive(): number {
    const exponentField = this.u32() % 2047;
    const hi = ((exponentField << 20) | (this.u32() & 0xfffff)) >>> 0;
    this.view.setUint32(0, this.u32(), true);
    this.view.setUint32(4, hi, true);
    return this.view.getFloat64(0, true);
  }
}

/** cyrb53-style 2 x 32-bit hash over each result's two 32-bit words. */
class BitHash {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly view = new DataView(new ArrayBuffer(8));

  add(x: number): void {
    this.view.setFloat64(0, x, true);
    for (const w of [
      this.view.getUint32(0, true),
      this.view.getUint32(4, true),
    ]) {
      this.h1 = Math.imul(this.h1 ^ w, 2654435761);
      this.h2 = Math.imul(this.h2 ^ w, 1597334677);
    }
  }

  hex(): string {
    let h1 = Math.imul(this.h1 ^ (this.h1 >>> 16), 2246822507);
    h1 ^= Math.imul(this.h2 ^ (this.h2 >>> 13), 3266489909);
    let h2 = Math.imul(this.h2 ^ (this.h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (
      (h2 >>> 0).toString(16).padStart(8, '0') +
      (h1 >>> 0).toString(16).padStart(8, '0')
    );
  }
}

/** One input set per function, covering each one's whole finite domain. */
function vector(fn: GoldenFunction, i: Inputs, k: number): number {
  switch (fn) {
    case 'pow':
      // Three shapes in turn: the cost curve, powers of ten, and general.
      if (k % 3 === 0) return pow(1.15, i.u32() % 100_001);
      if (k % 3 === 1) return pow(10, i.unit() * 600 - 300);
      return pow(i.unit() * 1000, i.unit() * 200 - 100);
    case 'exp':
      return exp(i.unit() * 1454.9 - 745.1);
    case 'ln':
      return ln(i.anyPositive());
    case 'log10':
      return log10(i.anyPositive());
    case 'expm1':
      return expm1(i.unit() * 760 - 50);
    case 'log1p':
      return log1p(k % 2 === 0 ? i.unit() * 2 - 1 : i.anyPositive());
  }
}

/** The digest of one function's 100,000 golden vectors. */
export function digest(fn: GoldenFunction): string {
  const inputs = new Inputs(20261001 + FUNCTIONS.indexOf(fn));
  const hash = new BitHash();
  for (let k = 0; k < VECTORS_PER_FUNCTION; k++)
    hash.add(vector(fn, inputs, k));
  return hash.hex();
}

export function digests(): Record<GoldenFunction, string> {
  const out = {} as Record<GoldenFunction, string>;
  for (const fn of FUNCTIONS) out[fn] = digest(fn);
  return out;
}
