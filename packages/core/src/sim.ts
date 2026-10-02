/**
 * The time model and the actions (M1 design §2.2, §2.3, §4).
 *
 * `integrate` is the pure, uncapped primitive: it moves both clocks by the
 * same amount and touches nothing else, because every stored quantity is
 * held at the anchor. `advance` is what a returning player gets: elapsed wall
 * time clamped to `[0, offline cap]`. `view` derives "now" values without
 * changing state. Actions act at the state's own simulated time; a caller
 * advances to the event's wall time first. Every action that changes a
 * stored quantity re-anchors first, so production up to the action is banked
 * at the rates that held before it.
 */
import { BALANCE } from './balance';
import { simMs, wallMs, type WallMs } from './clock';
import type { CourseData, Encounter } from './course';
import { purchaseCost } from './encounters';
import {
  insightFor,
  isDue,
  newWordMemory,
  review,
  reviewQueue,
  type QueueItem,
} from './memory';
import { Num, type NumTuple } from './num';
import {
  producedBetween,
  rateBreakdown,
  totalRate,
  type EncounterRate,
} from './production';
import { ownedCount, pickedWord, type GameState } from './state';
import {
  encounterCostFactor,
  findUpgrade,
  offlineCapMs,
  upgradeLevel,
  type UpgradeCurrency,
} from './upgrades';
import { currentDestination, curriculum, pickUpCost } from './words';

export type Rejection =
  | { readonly kind: 'unknownEncounter'; readonly id: string }
  | { readonly kind: 'invalidCount'; readonly count: number }
  | {
      readonly kind: 'unaffordable';
      readonly cost: NumTuple;
      readonly understanding: NumTuple;
    }
  | { readonly kind: 'poolEmpty' }
  | { readonly kind: 'unknownWord'; readonly itemId: string }
  | { readonly kind: 'notDue'; readonly itemId: string; readonly due: number }
  | { readonly kind: 'unknownUpgrade'; readonly id: string }
  | {
      readonly kind: 'upgradeMaxed';
      readonly id: string;
      readonly level: number;
    }
  | {
      readonly kind: 'upgradePrerequisite';
      readonly id: string;
      readonly requires: string;
    }
  | {
      readonly kind: 'upgradeUnaffordable';
      readonly id: string;
      readonly currency: UpgradeCurrency;
      readonly cost: NumTuple;
      readonly held: NumTuple;
    };

export type Result =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly rejection: Rejection };

export interface AdvanceSummary {
  /** Simulated time credited: the elapsed wall time, clamped. */
  readonly creditedMs: number;
  /** Whether the offline cap cut the credit short. */
  readonly clipped: boolean;
  readonly understandingEarned: NumTuple;
}

export interface View {
  readonly understanding: Num;
  /** Understanding per second, every multiplier included: the breakdown's rates, added. */
  readonly rate: Num;
  /** Each owned Encounter's rate as the product of its named multipliers (DN6). */
  readonly breakdown: readonly EncounterRate[];
  readonly insight: Num;
  /** At most 10 due items; how many more are due is never shown (DN23). */
  readonly queue: readonly QueueItem[];
}

/** Understanding at the state's simulated time: the anchor's, plus production since. */
export function understandingNow(course: CourseData, state: GameState): Num {
  return Num.add(
    Num.fromTuple(state.anchor.understanding),
    producedBetween(course, state, state.anchor.sim, state.sim),
  );
}

/** Move the anchor to the state's simulated time, holding the same values. */
function reanchor(course: CourseData, state: GameState): GameState {
  return {
    ...state,
    anchor: {
      sim: state.sim,
      understanding: Num.toTuple(understandingNow(course, state)),
    },
  };
}

/** Move both clocks forward by `elapsedMs`, uncapped (design §2.3). */
export function integrate(state: GameState, elapsedMs: number): GameState {
  const elapsed = simMs(elapsedMs);
  return {
    ...state,
    sim: simMs(state.sim + elapsed),
    wall: wallMs(state.wall + elapsed),
  };
}

/**
 * Bring the state to wall time `now` (design §2.3): the elapsed wall time,
 * clamped to `[0, offline cap]`, is credited to both clocks, and the wall
 * clock becomes `max(wall, now)`. When the cap clips, the wall clock runs on
 * past the simulated one; that changes the skew between them, so the state
 * is re-anchored first (the skew only ever changes at an anchor) and every
 * word's hour mean restarts there.
 */
export function advance(
  course: CourseData,
  state: GameState,
  now: WallMs,
): { readonly state: GameState; readonly summary: AdvanceSummary } {
  const elapsed = now - state.wall;
  const cap = offlineCapMs(state);
  const credited = Math.min(Math.max(elapsed, 0), cap);
  let next = integrate(state, credited);
  const clipped = elapsed > cap;
  if (clipped) {
    next = { ...reanchor(course, next), wall: now, memorySince: next.sim };
  }
  const earned = Num.sub(
    understandingNow(course, next),
    understandingNow(course, state),
  );
  return {
    state: next,
    summary: {
      creditedMs: credited,
      clipped,
      understandingEarned: Num.toTuple(earned),
    },
  };
}

/** The values at wall time `now`, derived without changing `state`. */
export function view(course: CourseData, state: GameState, now: WallMs): View {
  const at = advance(course, state, now).state;
  const breakdown = rateBreakdown(course, at, at.sim);
  return {
    understanding: understandingNow(course, at),
    rate: totalRate(breakdown),
    breakdown,
    insight: Num.fromTuple(at.insight),
    queue: reviewQueue(at.words, at.wall),
  };
}

/** One Listen tap: +1 Understanding (design §5). */
export function listen(course: CourseData, state: GameState): GameState {
  const anchored = reanchor(course, state);
  const understanding = Num.add(
    Num.fromTuple(anchored.anchor.understanding),
    Num.from(BALANCE.listen.understandingPerTap),
  );
  return {
    ...anchored,
    anchor: { ...anchored.anchor, understanding: Num.toTuple(understanding) },
  };
}

function findEncounter(course: CourseData, id: string): Encounter | undefined {
  for (const region of course.regions) {
    const found = region.encounters.find((e) => e.id === id);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Buy `count` of Encounter `id` at the state's simulated time. */
export function buyEncounter(
  course: CourseData,
  state: GameState,
  id: string,
  count: number,
): Result {
  const encounter = findEncounter(course, id);
  if (encounter === undefined) {
    return { ok: false, rejection: { kind: 'unknownEncounter', id } };
  }
  if (!Number.isSafeInteger(count) || count < 1) {
    return { ok: false, rejection: { kind: 'invalidCount', count } };
  }
  const owned = ownedCount(state, id);
  const cost = Num.mul(
    purchaseCost(encounter, owned, count),
    Num.from(encounterCostFactor(state)),
  );
  const anchored = reanchor(course, state);
  const understanding = Num.fromTuple(anchored.anchor.understanding);
  if (Num.cmp(understanding, cost) < 0) {
    return {
      ok: false,
      rejection: {
        kind: 'unaffordable',
        cost: Num.toTuple(cost),
        understanding: Num.toTuple(understanding),
      },
    };
  }
  return {
    ok: true,
    state: {
      ...anchored,
      anchor: {
        ...anchored.anchor,
        understanding: Num.toTuple(Num.sub(understanding, cost)),
      },
      owned: { ...anchored.owned, [id]: owned + count },
    },
  };
}

/**
 * Pick up the next word of the current destination in curriculum order,
 * paying for it from Understanding (parent §3.3).
 */
export function pickUpWord(course: CourseData, state: GameState): Result {
  const destination = currentDestination(course);
  const pool = destination === undefined ? [] : curriculum(destination);
  const next = pool.find((item) => pickedWord(state, item.id) === undefined);
  if (next === undefined) {
    return { ok: false, rejection: { kind: 'poolEmpty' } };
  }
  const picked = pool.filter(
    (item) => pickedWord(state, item.id) !== undefined,
  );
  const cost = pickUpCost(picked.length);
  const anchored = reanchor(course, state);
  const understanding = Num.fromTuple(anchored.anchor.understanding);
  if (Num.cmp(understanding, cost) < 0) {
    return {
      ok: false,
      rejection: {
        kind: 'unaffordable',
        cost: Num.toTuple(cost),
        understanding: Num.toTuple(understanding),
      },
    };
  }
  return {
    ok: true,
    state: {
      ...anchored,
      anchor: {
        ...anchored.anchor,
        understanding: Num.toTuple(Num.sub(understanding, cost)),
      },
      words: { ...anchored.words, [next.id]: newWordMemory(state.wall) },
    },
  };
}

/**
 * Answer the due review of word `itemId` at the state's wall time (parent
 * §3.4): a correct answer earns Insight by the rank it was asked at; a wrong
 * one costs nothing. Either way FSRS reschedules the word, and every word's
 * hour mean restarts here.
 */
export function answerReview(
  course: CourseData,
  state: GameState,
  itemId: string,
  correct: boolean,
): Result {
  const word = pickedWord(state, itemId);
  if (word === undefined) {
    return { ok: false, rejection: { kind: 'unknownWord', itemId } };
  }
  if (!isDue(word, state.wall)) {
    return {
      ok: false,
      rejection: { kind: 'notDue', itemId, due: word.card.due },
    };
  }
  const anchored = reanchor(course, state);
  const insight = correct
    ? Num.add(Num.fromTuple(anchored.insight), Num.from(insightFor(word.rank)))
    : Num.fromTuple(anchored.insight);
  return {
    ok: true,
    state: {
      ...anchored,
      insight: Num.toTuple(insight),
      words: {
        ...anchored.words,
        [itemId]: review(word, state.wall, correct),
      },
      memorySince: state.sim,
    },
  };
}

/**
 * Practise word `itemId`: open at any time, and it changes nothing, so it
 * cannot be ground for currency or rank (DN24).
 */
export function answerPractice(state: GameState, itemId: string): Result {
  if (pickedWord(state, itemId) === undefined) {
    return { ok: false, rejection: { kind: 'unknownWord', itemId } };
  }
  return { ok: true, state };
}

/**
 * Buy the next level of upgrade `id` (design §5), paid in Insight or in
 * Passport Stamps. Refused, in this order, when the course offers no such
 * upgrade, it is already at its last level, its prerequisite is not owned,
 * or the player cannot pay. An upgrade can change a rate, so production up
 * to the purchase is banked first. Spending stamps leaves `stampsEarned`,
 * and so the global bonus, alone.
 */
export function buyUpgrade(
  course: CourseData,
  state: GameState,
  id: string,
): Result {
  const upgrade = findUpgrade(course, id);
  if (upgrade === undefined) {
    return { ok: false, rejection: { kind: 'unknownUpgrade', id } };
  }
  const level = upgradeLevel(state, id);
  const cost = upgrade.costs[level];
  if (cost === undefined) {
    return { ok: false, rejection: { kind: 'upgradeMaxed', id, level } };
  }
  const { requires } = upgrade;
  if (requires !== undefined && upgradeLevel(state, requires) === 0) {
    return {
      ok: false,
      rejection: { kind: 'upgradePrerequisite', id, requires },
    };
  }
  const held =
    upgrade.currency === 'insight'
      ? Num.fromTuple(state.insight)
      : Num.from(state.stamps);
  if (Num.cmp(held, Num.from(cost)) < 0) {
    return {
      ok: false,
      rejection: {
        kind: 'upgradeUnaffordable',
        id,
        currency: upgrade.currency,
        cost: Num.toTuple(Num.from(cost)),
        held: Num.toTuple(held),
      },
    };
  }
  const anchored = reanchor(course, state);
  const upgrades = { ...anchored.upgrades, [id]: level + 1 };
  return {
    ok: true,
    state:
      upgrade.currency === 'insight'
        ? {
            ...anchored,
            insight: Num.toTuple(Num.sub(held, Num.from(cost))),
            upgrades,
          }
        : { ...anchored, stamps: anchored.stamps - cost, upgrades },
  };
}
