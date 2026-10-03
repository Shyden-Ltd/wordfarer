/**
 * Words (parent spec §3.3): pick-up, tags and the rank bonus.
 *
 * Spending Understanding picks up the next lexicon item of the current
 * destination in curriculum order: CEFR first, then the course's own order.
 * Each word boosts every Encounter sharing one of its tags by
 * b_w = rankBonus[rank] x (floorShare + (1 - floorShare) x R), so it never
 * falls below floorShare x rankBonus however long it goes unreviewed (DN16).
 */
import { BALANCE, type Rank } from './balance';
import type { Cefr, CourseData, Destination, LexiconItem } from './course';
import { Num } from './num';

const CEFR_ORDER: Readonly<Record<Cefr, number>> = { A1: 0, A2: 1, B1: 2 };
const PICK_UP_C0 = Num.from(BALANCE.words.pickUpC0);
const PICK_UP_GROWTH = Num.from(BALANCE.words.pickUpGrowth);

/**
 * The destination words are picked up from: the course's first until Set
 * Sail (#31) moves the player on.
 */
export function currentDestination(
  course: CourseData,
): Destination | undefined {
  return course.regions[0]?.destinations[0];
}

/** A destination's lexicon in curriculum order: CEFR, then course order. */
export function curriculum(destination: Destination): readonly LexiconItem[] {
  // Array.prototype.sort is stable, so equal CEFR keeps the course's order.
  return [...destination.lexicon].sort(
    (a, b) => CEFR_ORDER[a.cefr] - CEFR_ORDER[b.cefr],
  );
}

/** The cost of the next pick-up when `picked` items of the destination are held. */
export function pickUpCost(picked: number): Num {
  if (!Number.isSafeInteger(picked) || picked < 0) {
    throw new RangeError(
      `picked must be a safe non-negative integer, got ${String(picked)}`,
    );
  }
  return Num.mul(PICK_UP_C0, Num.pow(PICK_UP_GROWTH, picked));
}

/** A word's bonus at `rank` with mean retrievability `meanR` (parent §3.3). */
export function wordBonus(rank: Rank, meanR: number): number {
  const { rankBonus, floorShare } = BALANCE.words;
  return rankBonus[rank] * (floorShare + (1 - floorShare) * meanR);
}

/** Whether two tag lists share at least one tag. */
export function sharesTag(a: readonly string[], b: readonly string[]): boolean {
  return a.some((tag) => b.includes(tag));
}

const itemIndexes = new WeakMap<CourseData, ReadonlyMap<string, LexiconItem>>();

/** The lexicon item `id` anywhere in the course: a destination's, or a card's phrase pack's. */
export function lexiconItem(course: CourseData, id: string): LexiconItem {
  let index = itemIndexes.get(course);
  if (index === undefined) {
    const built = new Map<string, LexiconItem>();
    for (const region of course.regions) {
      for (const destination of region.destinations) {
        for (const item of destination.lexicon) built.set(item.id, item);
      }
      for (const card of region.cultureCards) {
        for (const item of card.phrasePack) built.set(item.id, item);
      }
    }
    itemIndexes.set(course, built);
    index = built;
  }
  const item = index.get(id);
  if (item === undefined) {
    throw new RangeError(`word ${id} is not in course ${course.id}`);
  }
  return item;
}
