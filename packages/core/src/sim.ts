/**
 * The time model and the Encounter actions (M1 design §2.2, §2.3, §4).
 *
 * `integrate` is the pure, uncapped primitive: it moves both clocks by the
 * same amount and touches nothing else, because every stored quantity is
 * held at the anchor. `advance` is what a returning player gets: elapsed wall
 * time clamped to `[0, offline cap]`. `view` derives "now" values without
 * changing state. Actions act at the state's own simulated time; a caller
 * advances to the event's wall time first.
 */
import { BALANCE } from './balance';
import { simMs, wallMs, type WallMs } from './clock';
import type { CourseData, Encounter } from './course';
import { purchaseCost } from './encounters';
import { Num, type NumTuple } from './num';
import { encounterRate, producedBetween } from './production';
import { ownedCount, type GameState } from './state';

export type Rejection =
  | { readonly kind: 'unknownEncounter'; readonly id: string }
  | { readonly kind: 'invalidCount'; readonly count: number }
  | {
      readonly kind: 'unaffordable';
      readonly cost: NumTuple;
      readonly understanding: NumTuple;
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
  /** Understanding per second. */
  readonly rate: Num;
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
 * is re-anchored first (the skew only ever changes at an anchor).
 */
export function advance(
  course: CourseData,
  state: GameState,
  now: WallMs,
): { readonly state: GameState; readonly summary: AdvanceSummary } {
  const elapsed = now - state.wall;
  const cap = BALANCE.offline.capMs;
  const credited = Math.min(Math.max(elapsed, 0), cap);
  let next = integrate(state, credited);
  const clipped = elapsed > cap;
  if (clipped) next = { ...reanchor(course, next), wall: now };
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
  return {
    understanding: understandingNow(course, at),
    rate: encounterRate(course, at),
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
  const cost = purchaseCost(encounter, owned, count);
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
