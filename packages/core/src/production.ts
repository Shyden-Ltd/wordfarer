/**
 * Production over simulated time (M1 design §2.2).
 *
 * The rate is constant inside each clock hour, a bucket. Each Encounter's
 * output is multiplied by M_words = 1 + the sum of b_w over the words sharing
 * one of its tags (parent §3.3), by x2 for each owned Phrasebook of one of
 * its tags, and by the global stamp bonus (design §5, #29). Each multiplier
 * is a named line of the rate breakdown (DN6), and the rate is the product
 * of its lines, so what is shown is what is paid. A word's bonus in a bucket uses its
 * exact mean retrievability over the bucket, on the wall clock, from the
 * later of the bucket's start and `memorySince`. The rate is linear in each
 * word's R, so an hour with no event produces exactly what the continuous
 * model does. A purchase leaves `memorySince` alone, so a bucket's means are
 * reused across it; a review or an offline-cap clip moves it, so the means
 * restart there.
 */
import { BALANCE } from './balance';
import { DAY_MS, HOUR_MS, bucketStart, simMs, type SimMs } from './clock';
import type { CourseData, Encounter } from './course';
import { encounterOutput, milestoneFactor } from './encounters';
import { meanRetrievability } from './memory';
import { Num } from './num';
import { ownedCount, type GameState } from './state';
import { globalMultiplier, phrasebookId, upgradeLevel } from './upgrades';
import { lexiconItem, sharesTag, wordBonus } from './words';

const THOUSAND = Num.from(1000);
const PHRASEBOOK = Num.from(BALANCE.insightUpgrades.phrasebookMultiplier);

/** One named multiplier of an Encounter's rate (DN6). */
export interface RateLine {
  /** `encounters`, `milestones`, `words`, `phrasebook:<tag>` or `stamps`. */
  readonly name: string;
  readonly factor: Num;
}

/** An owned Encounter's rate and the lines it is the product of. */
export interface EncounterRate {
  readonly id: string;
  readonly lines: readonly RateLine[];
  readonly rate: Num;
}

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

function linesFor(
  state: GameState,
  encounter: Encounter,
  owned: number,
  bonuses: readonly TaggedBonus[],
  stamps: Num,
): readonly RateLine[] {
  const lines: RateLine[] = [
    { name: 'encounters', factor: Num.from(encounter.p0 * owned) },
    { name: 'milestones', factor: milestoneFactor(owned) },
    { name: 'words', factor: Num.from(multiplier(bonuses, encounter)) },
  ];
  for (const tag of encounter.tags) {
    const id = phrasebookId(tag);
    if (upgradeLevel(state, id) > 0)
      lines.push({ name: id, factor: PHRASEBOOK });
  }
  lines.push({ name: 'stamps', factor: stamps });
  return lines;
}

/**
 * Each owned Encounter's rate in the bucket holding `t`, in course order,
 * with the named lines it is the product of (DN6).
 */
export function rateBreakdown(
  course: CourseData,
  state: GameState,
  t: SimMs,
): readonly EncounterRate[] {
  let bonuses: readonly TaggedBonus[] | undefined;
  const stamps = Num.from(globalMultiplier(state));
  const rates: EncounterRate[] = [];
  for (const region of course.regions) {
    for (const encounter of region.encounters) {
      const owned = ownedCount(state, encounter.id);
      if (owned === 0) continue;
      bonuses ??= bucketBonuses(course, state, t);
      const lines = linesFor(state, encounter, owned, bonuses, stamps);
      rates.push({
        id: encounter.id,
        lines,
        rate: lines.reduce((r, l) => Num.mul(r, l.factor), Num.from(1)),
      });
    }
  }
  return rates;
}

/** The total of a breakdown's rates, added in its order. */
export function totalRate(breakdown: readonly EncounterRate[]): Num {
  return breakdown.reduce((total, e) => Num.add(total, e.rate), Num.from(0));
}

/** Understanding per second in the bucket holding `t`, every multiplier included. */
export function rateAt(course: CourseData, state: GameState, t: SimMs): Num {
  return totalRate(rateBreakdown(course, state, t));
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
