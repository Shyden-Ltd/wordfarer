/**
 * The game state and its anchor (M1 design §2.2, §2.3, §4).
 *
 * State is plain, serialisable data: integer-millisecond clocks, `Num`s as
 * `[mantissa, exponent]` tuples, counts as integers. Every stored quantity is
 * its value at the **anchor**, the simulated time of the last event; values at
 * any later time are derived and never stored. That is what makes splitting
 * an interval unable to change any stored arithmetic.
 */
import { BALANCE, type JourneyDurationId } from './balance';
import { simMs, type SimMs, type WallMs } from './clock';
import type { WordMemory } from './memory';
import { Num, type NumTuple } from './num';
import { createStreams, type RngStreams } from './rng';

/** The state's own random streams, one per purpose (design §3). */
export const RNG_STREAMS = ['cards'] as const;

/** A Journey out in a slot (design §5, #30). */
export interface Journey {
  readonly durationId: JourneyDurationId;
  /** The simulated time it returns, fixed when it started. */
  readonly returnsAt: SimMs;
  /** The culture card it brings back, drawn when it started. */
  readonly cardId: string;
}

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
  /** Passport Stamps held: what stamp upgrades are paid from. */
  readonly stamps: number;
  /**
   * Every stamp ever earned: the global production bonus counts these, so
   * spending stamps never lowers it (operator, 2026-10-02, #29).
   */
  readonly stampsEarned: number;
  /** Upgrade levels, by upgrade id. An id that is absent is at level 0. */
  readonly upgrades: Readonly<Record<string, number>>;
  /** The random streams, named by `RNG_STREAMS`, so a replay draws the same. */
  readonly rng: RngStreams;
  /** Each Journey slot in turn, `null` when empty: `BALANCE.journeys.maxSlots` long. */
  readonly journeys: readonly (Journey | null)[];
  /** Culture cards held, by id, in the order they were collected. */
  readonly cards: readonly string[];
  /** Whether the once-per-game tutorial Journey has been started. */
  readonly tutorialJourneyUsed: boolean;
}

/**
 * A new game at wall time `wall` whose draws come from `seed`: nothing owned,
 * no currency, no words, no upgrades, every Journey slot empty.
 */
export function initialState(wall: WallMs, seed: number): GameState {
  const start = simMs(0);
  return {
    sim: start,
    wall,
    anchor: { sim: start, understanding: Num.toTuple(Num.from(0)) },
    owned: {},
    insight: Num.toTuple(Num.from(0)),
    words: {},
    memorySince: start,
    stamps: 0,
    stampsEarned: 0,
    upgrades: {},
    rng: createStreams(seed, RNG_STREAMS),
    journeys: Array.from({ length: BALANCE.journeys.maxSlots }, () => null),
    cards: [],
    tutorialJourneyUsed: false,
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
