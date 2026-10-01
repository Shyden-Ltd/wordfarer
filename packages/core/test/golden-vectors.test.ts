import { describe, expect, it } from 'vitest';
import { digests, FUNCTIONS, VECTORS_PER_FUNCTION } from './golden-vectors';

/**
 * The golden vectors' Node digests (#26 AC10), measured 2026-10-01.
 *
 * tests/engines proves each browser engine gives Node's bits; this pin proves
 * Node's bits have not moved. A det-math change that alters any result, such
 * as swapping in Math.pow, moves a digest, so it is seen here first, on
 * every engine, before the cross-engine comparison runs.
 */

describe('det-math golden vectors', () => {
  it('cover at least 100,000 inputs for each of the six functions', () => {
    expect(VECTORS_PER_FUNCTION).toBe(100_000);
    expect([...FUNCTIONS].sort()).toEqual([
      'exp',
      'expm1',
      'ln',
      'log10',
      'log1p',
      'pow',
    ]);
  });

  it('hash to the pinned digests under Node', () => {
    expect(digests()).toEqual({
      pow: '3d7063d7ea64de4e',
      exp: '282e82fba82afd4e',
      ln: 'c42cd90d8c5957cf',
      log10: '7975fd2b8f7c506e',
      expm1: '2c1250daae88b5ac',
      log1p: '2b1b9cb3cddb4cb2',
    });
  });
});
