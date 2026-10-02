/**
 * Production over simulated time (M1 design §2.2).
 *
 * The rate is constant inside each clock hour, a bucket. Each Encounter's
 * output is multiplied by M_words = 1 + the sum of b_w over the words sharing
 * one of its tags (parent §3.3), and a word's bonus in a bucket uses its
 * exact mean retrievability over the bucket, on the wall clock, from the
 * later of the bucket's start and `memorySince`. The rate is linear in each
 * word's R, so an hour with no event produces exactly what the continuous
 * model does. A purchase leaves `memorySince` alone, so a bucket's means are
 * reused across it; a review or an offline-cap clip moves it, so the means
 * restart there.
 */
import { DAY_MS, HOUR_MS, bucketStart, simMs, type SimMs } from './clock';
import type { CourseData, Encounter } from './course';
import { encounterOutput } from './encounters';
import { meanRetrievability } from './memory';
import { Num } from './num';
import { ownedCount, type GameState } from './state';
import { lexiconItem, sharesTag, wordBonus } from './words';

const THOUSAND = Num.from(1000);

interface TaggedBonus {
  readonly tags: readonly string[];
  readonly bonus: number;
}

/** Understanding per second from every owned Encounter, before any multiplier. */
export function encounterRate(course: CourseData, state: GameState): Num {
  let rate = Num.from(0);
  for (const region of course.regions) {
    for (const encounter of region.encounters) {
      const owned = ownedCount(state, encounter.id);
      if (owned > 0) rate = Num.add(rate, encounterOutput(encounter, owned));
    }
  }
  return rate;
}

/**
 * Every word's bonus in the bucket holding `t`, in code-unit order of id, so
 * the sums that use them add in the same order on every engine.
 */
function bucketBonuses(
  course: CourseData,
  state: GameState,
  t: SimMs,
): readonly TaggedBonus[] {
  const start = bucketStart(t);
  const from = Math.max(start, state.memorySince);
  const spanDays = (start + HOUR_MS - from) / DAY_MS;
  const skew = state.wall - state.sim;
  return Object.entries(state.words)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, word]) => {
      const { lastReview, stability } = word.card;
      const meanR =
        lastReview === null
          ? 0
          : meanRetrievability(
              stability,
              (from + skew - lastReview) / DAY_MS,
              spanDays,
            );
      return {
        tags: lexiconItem(course, id).tags,
        bonus: wordBonus(word.rank, meanR),
      };
    });
}

function multiplier(
  bonuses: readonly TaggedBonus[],
  encounter: Encounter,
): number {
  let m = 1;
  for (const { tags, bonus } of bonuses) {
    if (sharesTag(tags, encounter.tags)) m += bonus;
  }
  return m;
}

/** M_words for `encounter` in the bucket holding `t`. */
export function wordMultiplier(
  course: CourseData,
  state: GameState,
  encounter: Encounter,
  t: SimMs,
): number {
  return multiplier(bucketBonuses(course, state, t), encounter);
}

/** Understanding per second in the bucket holding `t`, word multipliers included. */
export function rateAt(course: CourseData, state: GameState, t: SimMs): Num {
  let bonuses: readonly TaggedBonus[] | undefined;
  let rate = Num.from(0);
  for (const region of course.regions) {
    for (const encounter of region.encounters) {
      const owned = ownedCount(state, encounter.id);
      if (owned === 0) continue;
      bonuses ??= bucketBonuses(course, state, t);
      rate = Num.add(
        rate,
        Num.mul(
          encounterOutput(encounter, owned),
          Num.from(multiplier(bonuses, encounter)),
        ),
      );
    }
  }
  return rate;
}

/** Understanding produced over `[from, to)`, bucket by bucket. */
export function producedBetween(
  course: CourseData,
  state: GameState,
  from: SimMs,
  to: SimMs,
): Num {
  if (to < from) {
    throw new RangeError(
      `producedBetween: ${String(to)} is before ${String(from)}`,
    );
  }
  let total = Num.from(0);
  for (let t = from; t < to;) {
    const end = simMs(Math.min(bucketStart(t) + HOUR_MS, to));
    total = Num.add(
      total,
      Num.mul(rateAt(course, state, t), Num.from(end - t)),
    );
    t = end;
  }
  return Num.div(total, THOUSAND);
}
