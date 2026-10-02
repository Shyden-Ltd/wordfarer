/**
 * The game state and its anchor (M1 design §2.2, §2.3, §4).
 *
 * State is plain, serialisable data: integer-millisecond clocks, `Num`s as
 * `[mantissa, exponent]` tuples, counts as integers. Every stored quantity is
 * its value at the **anchor**, the simulated time of the last event; values at
 * any later time are derived and never stored. That is what makes splitting
 * an interval unable to change any stored arithmetic.
 */
import { simMs, type SimMs, type WallMs } from './clock';
import type { WordMemory } from './memory';
import { Num, type NumTuple } from './num';

export interface Anchor {
  /** The simulated time the stored quantities hold at. */
  readonly sim: SimMs;
  readonly understanding: NumTuple;
}

export interface GameState {
  /** The simulated (economy) clock. */
  readonly sim: SimMs;
  /** The latest wall-clock time seen: drives memory and the calendar. */
  readonly wall: WallMs;
  readonly anchor: Anchor;
  /** Encounters owned, by id. An id that is absent is owned 0 times. */
  readonly owned: Readonly<Record<string, number>>;
  /** Insight held. Only correct due reviews earn it, so it never accrues between events. */
  readonly insight: NumTuple;
  /** Words picked up, by lexicon item id: each one's rank and FSRS card. */
  readonly words: Readonly<Record<string, WordMemory>>;
  /**
   * The simulated time since which every word's retrievability curve and the
   * wall-minus-sim skew have held unchanged: the last review or offline-cap
   * clip. Each word's mean R in an hour bucket is taken from here or the
   * bucket's start, whichever is later (design §2.2 item 3).
   */
  readonly memorySince: SimMs;
}

/** A new game at wall time `wall`: nothing owned, no Understanding, no words. */
export function initialState(wall: WallMs): GameState {
  const start = simMs(0);
  return {
    sim: start,
    wall,
    anchor: { sim: start, understanding: Num.toTuple(Num.from(0)) },
    owned: {},
    insight: Num.toTuple(Num.from(0)),
    words: {},
    memorySince: start,
  };
}

/** How many of Encounter `id` the state owns. Reads own keys only. */
export function ownedCount(state: GameState, id: string): number {
  return Object.hasOwn(state.owned, id) ? (state.owned[id] ?? 0) : 0;
}

/** The memory of word `id` if it has been picked up. Reads own keys only. */
export function pickedWord(
  state: GameState,
  id: string,
): WordMemory | undefined {
  return Object.hasOwn(state.words, id) ? state.words[id] : undefined;
}
