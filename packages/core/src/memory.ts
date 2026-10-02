/**
 * Memory (parent spec §3.3, §3.4; M1 design §2.2 item 4).
 *
 * FSRS-6 retrievability t days after a review, at stability S days, is
 * R(t) = (1 + F t / S)^(-d), where d is the scheduler's decay w[20] and
 * F = 0.9^(-1/d) - 1 puts R at 90% when t = S. Production needs each word's
 * mean R over an hour bucket, so this module also gives that mean in closed
 * form. Everything goes through det-math, so the bits match on every engine.
 */
import { generatorParameters } from 'ts-fsrs';
import { exp, expm1, log1p, pow } from './det-math';

const PARAMETERS = generatorParameters({ enable_fuzz: false });

const decay = PARAMETERS.w[20];
if (decay === undefined) {
  throw new Error('ts-fsrs parameters have no w[20], so they are not FSRS-6');
}

/** FSRS-6's decay, w[20], read from the scheduler's own parameters. */
export const DECAY: number = decay;

/** F = 0.9^(-1/d) - 1, so that R(S) = 0.9. */
export const FACTOR: number = pow(0.9, -1 / DECAY) - 1;

function checkStability(stabilityDays: number): void {
  if (!Number.isFinite(stabilityDays) || stabilityDays <= 0) {
    throw new RangeError(
      `stability must be positive and finite, got ${String(stabilityDays)}`,
    );
  }
}

function checkElapsed(elapsedDays: number): void {
  if (!Number.isFinite(elapsedDays) || elapsedDays < 0) {
    throw new RangeError(
      `elapsed time must be non-negative and finite, got ${String(elapsedDays)}`,
    );
  }
}

/** R, `elapsedDays` after a review that left stability `stabilityDays`. */
export function retrievability(
  stabilityDays: number,
  elapsedDays: number,
): number {
  checkStability(stabilityDays);
  checkElapsed(elapsedDays);
  // (1 + x)^(-d) as exp(-d log1p(x)): exact where x is tiny.
  return exp(-DECAY * log1p((FACTOR * elapsedDays) / stabilityDays));
}

/**
 * The mean of R over [fromDays, fromDays + spanDays] after a review.
 *
 * From the review (from = 0) the integral is closed:
 * mean0(S, T) = S / (F (1 - d) T) x expm1((1 - d) log1p(F T / S)).
 * The expm1/log1p form keeps full precision on short spans, where
 * ((1 + x)^(1-d) - 1) loses it. A window that starts later is the same
 * curve shifted: 1 + F(a + u)/S = (1 + F a/S)(1 + F u/S') with
 * S' = S + F a, so mean(S, a, T) = R(S, a) x mean0(S', T). Taking the
 * difference of two integrals instead loses up to 0.58% (measured
 * 2026-10-02 at a = 100 years, T = 1 ms); this form's worst is 1.2e-15.
 */
export function meanRetrievability(
  stabilityDays: number,
  fromDays: number,
  spanDays: number,
): number {
  checkStability(stabilityDays);
  checkElapsed(fromDays);
  if (!Number.isFinite(spanDays) || spanDays <= 0) {
    throw new RangeError(
      `span must be positive and finite, got ${String(spanDays)}`,
    );
  }
  const shifted = stabilityDays + FACTOR * fromDays;
  const kept = 1 - DECAY;
  const fromStart =
    (shifted / (FACTOR * kept * spanDays)) *
    expm1(kept * log1p((FACTOR * spanDays) / shifted));
  return retrievability(stabilityDays, fromDays) * fromStart;
}
