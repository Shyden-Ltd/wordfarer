/**
 * Every tunable number in the game, in one frozen table (parent spec §3, M1
 * design §5).
 *
 * These are starting values for the pacing bots (#35) to tune, and the
 * operator may veto any of them. The bots guard outcomes, not these
 * constants. Each later M1 story adds the keys its rules need (for example
 * the Set Sail goal curve in #31), and the `Balance` type makes a missing key
 * a typecheck error. Times are integer milliseconds.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Insight upgrades priced by level (design §5, #29). */
export type InsightUpgradeId =
  | 'journeySlot2'
  | 'journeySlot3'
  | 'offlineCap'
  | 'phrasebook'
  | 'pemanduFaster1'
  | 'pemanduFaster2'
  | 'pemanduFaster3';

/** Passport Stamp upgrades priced by level (design §5, #29). */
export type StampUpgradeId =
  'startingUnderstanding' | 'encounterDiscount' | 'journeyCut' | 'pemanduEarly';

/** Word ranks, Heard (new) to Mastered (parent §3.4). */
export type Rank = 'heard' | 'recognised' | 'recalled' | 'fluent' | 'mastered';

export interface Balance {
  readonly listen: {
    /** Understanding per Listen tap (design §5). */
    readonly understandingPerTap: number;
  };
  readonly encounters: {
    /** The n-th purchase costs c0 x costGrowth^n (parent §3.2). */
    readonly costGrowth: number;
    /** Owned counts that each double output (parent §3.2). */
    readonly milestones: readonly number[];
    /** After the last listed milestone, one more every this many owned. */
    readonly milestoneEvery: number;
    readonly milestoneMultiplier: number;
    /** Understanding at which the first Encounter appears (parent §4.1). */
    readonly firstAtUnderstanding: number;
  };
  readonly words: {
    /** b_w = rankBonus[rank] x (floorShare + (1 - floorShare) x R) (parent §3.3). */
    readonly rankBonus: Readonly<Record<Rank, number>>;
    readonly floorShare: number;
    /** The n-th pick-up in a destination (n already picked there) costs pickUpC0 x pickUpGrowth^n (design §5). */
    readonly pickUpC0: number;
    readonly pickUpGrowth: number;
  };
  readonly memory: {
    /** FSRS stability, in days, at which each rank above Heard is reached (parent §3.4). */
    readonly rankStabilityDays: Readonly<
      Record<Exclude<Rank, 'heard'>, number>
    >;
    /** At most this many due items are shown (parent §3.4, DN23). */
    readonly queueSize: number;
    /** A correct due answer gives insightBase + insightPerRank x rankIndex. */
    readonly insightBase: number;
    readonly insightPerRank: number;
    /** The tutorial word falls due this long after pick-up (parent §4.1). */
    readonly tutorialDueMs: number;
  };
  readonly journeys: {
    /** Tutorial outing first, then the regular durations (parent §4.2). */
    readonly durationsMs: readonly number[];
    readonly startingSlots: number;
    readonly maxSlots: number;
  };
  readonly stamps: {
    /**
     * Global production per stamp ever earned (parent §3.1): spending stamps
     * never lowers it (operator, 2026-10-02, #29).
     */
    readonly globalBonusPerStamp: number;
    /** Each stamp upgrade's cost at each level; it is maxed at the last. */
    readonly costs: Readonly<Record<StampUpgradeId, readonly number[]>>;
    /** Understanding a destination starts with, per level (design §5). */
    readonly startingUnderstandingPerLevel: number;
    /** Stamp upgrades (design §5). */
    readonly costDiscountPerLevel: number;
    readonly costDiscountCap: number;
    readonly journeyCutPerLevel: number;
    readonly journeyCutCap: number;
  };
  readonly insightUpgrades: {
    /** "Phrasebook": production multiplier for one tag (design §5). */
    readonly phrasebookMultiplier: number;
    /**
     * Each Insight upgrade's cost at each level; it is maxed at the last.
     * `phrasebook` prices every tag's Phrasebook.
     */
    readonly costs: Readonly<Record<InsightUpgradeId, readonly number[]>>;
  };
  readonly offline: {
    /** Offline time credited, raised by Insight upgrades (design §5, DN19). */
    readonly capMs: number;
    readonly capStepMs: number;
    readonly maxCapMs: number;
  };
  readonly grammar: {
    /** A node multiplies each word on its roots by (1 + rootGain) (design §5). */
    readonly rootGain: number;
  };
  readonly automation: {
    /** Pemandu intervals: the starting one, then each upgrade (design §5). */
    readonly intervalsMs: readonly number[];
  };
  readonly mastery: {
    /** A replayed destination's goal x goalGrowthPerReplay^replays (design §5). */
    readonly goalGrowthPerReplay: number;
  };
  readonly seasons: {
    /** A festival card's bonus while its window is live (design §5). */
    readonly inSeasonMultiplier: number;
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const BALANCE: Balance = deepFreeze({
  listen: { understandingPerTap: 1 },
  encounters: {
    costGrowth: 1.15,
    milestones: [10, 25, 50, 100],
    milestoneEvery: 100,
    milestoneMultiplier: 2,
    firstAtUnderstanding: 10,
  },
  words: {
    rankBonus: {
      heard: 0.02,
      recognised: 0.05,
      recalled: 0.12,
      fluent: 0.25,
      mastered: 0.4,
    },
    floorShare: 0.5,
    pickUpC0: 20,
    pickUpGrowth: 1.15,
  },
  memory: {
    rankStabilityDays: { recognised: 2, recalled: 7, fluent: 14, mastered: 30 },
    queueSize: 10,
    insightBase: 1,
    insightPerRank: 0.5,
    tutorialDueMs: 4 * MINUTE_MS,
  },
  journeys: {
    durationsMs: [
      30 * MINUTE_MS,
      2 * HOUR_MS,
      4 * HOUR_MS,
      8 * HOUR_MS,
      24 * HOUR_MS,
    ],
    startingSlots: 1,
    maxSlots: 3,
  },
  stamps: {
    globalBonusPerStamp: 0.1,
    costs: {
      startingUnderstanding: [1, 2, 3, 5, 8],
      encounterDiscount: [1, 1, 2, 2, 3, 3, 4, 4],
      journeyCut: [2, 3, 5],
      pemanduEarly: [5],
    },
    startingUnderstandingPerLevel: 100,
    costDiscountPerLevel: 0.05,
    costDiscountCap: 0.4,
    journeyCutPerLevel: 0.1,
    journeyCutCap: 0.3,
  },
  insightUpgrades: {
    phrasebookMultiplier: 2,
    costs: {
      journeySlot2: [25],
      journeySlot3: [100],
      offlineCap: [40, 120],
      phrasebook: [20],
      pemanduFaster1: [30],
      pemanduFaster2: [90],
      pemanduFaster3: [250],
    },
  },
  offline: {
    capMs: 24 * HOUR_MS,
    capStepMs: 24 * HOUR_MS,
    maxCapMs: 72 * HOUR_MS,
  },
  grammar: { rootGain: 0.5 },
  automation: { intervalsMs: [10_000, 5_000, 2_000, 1_000] },
  mastery: { goalGrowthPerReplay: 1.5 },
  seasons: { inSeasonMultiplier: 2 },
});
