/**
 * Production over simulated time (M1 design §2.2).
 *
 * The rate is constant inside each clock hour, a bucket. Each Encounter's
 * output is multiplied by M_words = 1 + the sum of b_w over the words sharing
 * one of its tags (parent §3.3), by x2 for each owned Phrasebook of one of
 * its tags, by its held culture cards and complete sets (design §5, #30),
 * and by the global stamp bonus (design §5, #29). Each multiplier
 * is a named line of the rate breakdown (DN6), and the rate is the product
 * of its lines, so what is shown is what is paid. A word's bonus in a bucket uses its
 * exact mean retrievability over the bucket, on the wall clock, from the
 * later of the bucket's start and `memorySince`. The rate is linear in each
 * word's R, so an hour with no event produces exactly what the continuous
 * model does. A purchase leaves `memorySince` alone, so a bucket's means are
 * reused across it; a review or an offline-cap clip moves it, so the means
 * restart there. A held festival card's window edge splits a bucket, since
 * the card's bonus doubles from that wall-clock millisecond (#30).
 */
import { BALANCE } from './balance';
import { DAY_MS, HOUR_MS, bucketStart, simMs, type SimMs } from './clock';
import { cardFactor, heldCards, nextFestivalEdge, setFactor } from './cards';
import type { CourseData, CultureCard, Encounter } from './course';
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
  /** `encounters`, `milestones`, `words`, `phrasebook:<tag>`, `cards`, `sets` or `stamps`. */
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

/** What every Encounter's lines share at one moment. */
interface Shared {
  readonly held: readonly CultureCard[];
  readonly wall: number;
  readonly sets: number | undefined;
  readonly stamps: Num;
}

function linesFor(
  state: GameState,
  encounter: Encounter,
  owned: number,
  bonuses: readonly TaggedBonus[],
  shared: Shared,
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
  const cards = cardFactor(shared.held, encounter, shared.wall);
  if (cards !== undefined)
    lines.push({ name: 'cards', factor: Num.from(cards) });
  if (shared.sets !== undefined)
    lines.push({ name: 'sets', factor: Num.from(shared.sets) });
  lines.push({ name: 'stamps', factor: shared.stamps });
  return lines;
}

/**
 * Each owned Encounter's rate at simulated time `t`, in course order, with
 * the named lines it is the product of (DN6). The words' means are the
 * bucket's; a festival is judged at `t`'s wall time, `t` plus the skew.
 */
export function rateBreakdown(
  course: CourseData,
  state: GameState,
  t: SimMs,
): readonly EncounterRate[] {
  let bonuses: readonly TaggedBonus[] | undefined;
  const held = heldCards(course, state);
  const shared: Shared = {
    held,
    wall: t + state.wall - state.sim,
    sets: setFactor(course, held),
    stamps: Num.from(globalMultiplier(state)),
  };
  const rates: EncounterRate[] = [];
  for (const region of course.regions) {
    for (const encounter of region.encounters) {
      const owned = ownedCount(state, encounter.id);
      if (owned === 0) continue;
      bonuses ??= bucketBonuses(course, state, t);
      const lines = linesFor(state, encounter, owned, bonuses, shared);
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

/** Understanding per second at simulated time `t`, every multiplier included. */
export function rateAt(course: CourseData, state: GameState, t: SimMs): Num {
  return totalRate(rateBreakdown(course, state, t));
}

/** Understanding at the state's simulated time: the anchor's, plus production since. */
export function understandingNow(course: CourseData, state: GameState): Num {
  return Num.add(
    Num.fromTuple(state.anchor.understanding),
    producedBetween(course, state, state.anchor.sim, state.sim),
  );
}

/**
 * Understanding produced over `[from, to)`, bucket by bucket, each bucket
 * split at a held festival card's window edges.
 */
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
  const skew = state.wall - state.sim;
  const held = heldCards(course, state);
  let total = Num.from(0);
  for (let t = from; t < to;) {
    const edge = nextFestivalEdge(held, t + skew);
    const end = simMs(
      Math.min(
        bucketStart(t) + HOUR_MS,
        to,
        edge === undefined ? to : edge - skew,
      ),
    );
    // An edge found on the wrong clock could end a segment at or before its
    // start, and the loop would never finish: refuse it instead.
    if (end <= t) {
      throw new RangeError(
        `producedBetween: the segment from ${String(t)} ends at ${String(end)}`,
      );
    }
    total = Num.add(
      total,
      Num.mul(rateAt(course, state, t), Num.from(end - t)),
    );
    t = end;
  }
  return Num.div(total, THOUSAND);
}
