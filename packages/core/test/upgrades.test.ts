import { describe, expect, it } from 'vitest';
import {
  BALANCE,
  type InsightUpgradeId,
  type StampUpgradeId,
} from '../src/balance';
import { simMs, wallMs, type WallMs } from '../src/clock';
import type { CourseData } from '../src/course';
import { Num } from '../src/num';
import { buyUpgrade, understandingNow, type Result } from '../src/sim';
import { initialState, type GameState } from '../src/state';
import {
  encounterCostFactor,
  findUpgrade,
  globalMultiplier,
  journeyDurationFactor,
  journeySlots,
  offlineCapMs,
  pemanduIntervalsMs,
  startingUnderstanding,
  upgradeCatalogue,
  upgradeLevel,
  type Upgrade,
} from '../src/upgrades';

/**
 * Insight and Passport Stamp upgrades (#29 AC1, AC2, AC3, AC5): the two
 * catalogues, their effects, and `buyUpgrade`.
 *
 * The course is declared here rather than imported, so it is checked against
 * the `CourseData` contract instead of sharing it.
 */

const HOUR_MS = 3_600_000;

const course: CourseData = {
  id: 'upgrades-course',
  tags: ['food', 'market', 'family'],
  regions: [
    {
      id: 'r0',
      destinations: [],
      encounters: [{ id: 'tea', tags: ['food'], c0: 10, p0: 0.1 }],
      cardSets: [],
      cultureCards: [],
      grammarNodes: [],
    },
  ],
};

const START: WallMs = wallMs(Date.UTC(2027, 0, 4));

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

interface Holding {
  readonly insight?: number;
  readonly stamps?: number;
  readonly stampsEarned?: number;
  readonly upgrades?: Record<string, number>;
  readonly owned?: Record<string, number>;
  readonly leadMs?: number;
}

/** A game `leadMs` past its anchor, holding the given currencies and levels. */
function holding(h: Holding): GameState {
  const base = initialState(START);
  const lead = h.leadMs ?? 0;
  return deepFreeze({
    ...base,
    sim: simMs(lead),
    wall: wallMs(START + lead),
    owned: h.owned ?? {},
    insight: Num.toTuple(Num.from(h.insight ?? 0)),
    stamps: h.stamps ?? 0,
    stampsEarned: h.stampsEarned ?? h.stamps ?? 0,
    upgrades: h.upgrades ?? {},
  });
}

function ok(result: Result): GameState {
  if (!result.ok) {
    throw new Error(`rejected: ${JSON.stringify(result.rejection)}`);
  }
  return deepFreeze(result.state);
}

function entry(id: string): Upgrade {
  const found = findUpgrade(course, id);
  if (found === undefined) throw new Error(`no upgrade ${id}`);
  return found;
}

const PROTOTYPE_NAMES = [
  'toString',
  'constructor',
  '__proto__',
  'hasOwnProperty',
];

describe('the Insight catalogue (AC1)', () => {
  it('holds exactly these upgrades, Phrasebooks in course tag order', () => {
    expect(
      upgradeCatalogue(course)
        .filter((u) => u.currency === 'insight')
        .map((u) => u.id),
    ).toEqual([
      'journeySlot2',
      'journeySlot3',
      'offlineCap',
      'phrasebook:food',
      'phrasebook:market',
      'phrasebook:family',
      'pemanduFaster1',
      'pemanduFaster2',
      'pemanduFaster3',
    ]);
  });

  it.each<[string, readonly number[], string | undefined]>([
    ['journeySlot2', [25], undefined],
    ['journeySlot3', [100], 'journeySlot2'],
    ['offlineCap', [40, 120], undefined],
    ['phrasebook:food', [20], undefined],
    ['phrasebook:market', [20], undefined],
    ['phrasebook:family', [20], undefined],
    ['pemanduFaster1', [30], undefined],
    ['pemanduFaster2', [90], 'pemanduFaster1'],
    ['pemanduFaster3', [250], 'pemanduFaster2'],
  ])('%s costs %j Insight, requiring %s', (id, costs, requires) => {
    const u = entry(id);
    expect(u.currency).toBe('insight');
    expect(u.costs).toEqual(costs);
    expect(u.requires).toBe(requires);
  });

  it.each<InsightUpgradeId>([
    'journeySlot2',
    'journeySlot3',
    'offlineCap',
    'pemanduFaster1',
  ])('%s reads its costs from BALANCE itself', (id) => {
    expect(entry(id).costs).toBe(BALANCE.insightUpgrades.costs[id]);
  });

  it('every Phrasebook reads its cost from BALANCE itself', () => {
    expect(entry('phrasebook:market').costs).toBe(
      BALANCE.insightUpgrades.costs.phrasebook,
    );
  });

  it.each(['food', 'market', 'family'])(
    'phrasebook:%s doubles its own tag',
    (tag) => {
      expect(entry(`phrasebook:${tag}`).tag).toBe(tag);
    },
  );

  it('offers no Phrasebook for a tag the course does not use', () => {
    expect(findUpgrade(course, 'phrasebook:transport')).toBeUndefined();
  });
});

describe('the stamp catalogue (AC2)', () => {
  it('holds exactly these upgrades', () => {
    expect(
      upgradeCatalogue(course)
        .filter((u) => u.currency === 'stamps')
        .map((u) => u.id),
    ).toEqual([
      'startingUnderstanding',
      'encounterDiscount',
      'journeyCut',
      'pemanduEarly',
    ]);
  });

  it.each<[StampUpgradeId, readonly number[]]>([
    ['startingUnderstanding', [1, 2, 3, 5, 8]],
    ['encounterDiscount', [1, 1, 2, 2, 3, 3, 4, 4]],
    ['journeyCut', [2, 3, 5]],
    ['pemanduEarly', [5]],
  ])('%s costs %j stamps, with no prerequisite', (id, costs) => {
    const u = entry(id);
    expect(u.currency).toBe('stamps');
    expect(u.costs).toEqual(costs);
    expect(u.costs).toBe(BALANCE.stamps.costs[id]);
    expect(u.requires).toBeUndefined();
  });

  it.each<[number, number]>([
    [0, 0],
    [1, 100],
    [5, 500],
  ])('starting Understanding at level %i is %i', (level, want) => {
    expect(
      startingUnderstanding(
        holding({ upgrades: { startingUnderstanding: level } }),
      ),
    ).toBe(want);
  });

  it.each<[number, number, number]>([
    [0, 0, 1],
    [0, 1, 1.1],
    [0, 5, 1.5],
    [3, 5, 1.5],
    [5, 5, 1.5],
    [0, 12, 2.2],
  ])(
    'holding %i stamps of %i earned gives x%d global production',
    (stamps, stampsEarned, want) => {
      expect(globalMultiplier(holding({ stamps, stampsEarned }))).toBeCloseTo(
        want,
        14,
      );
    },
  );

  it('spending stamps leaves the global bonus where it was (operator, 2026-10-02)', () => {
    const before = holding({ stamps: 5 });
    const after = ok(buyUpgrade(course, before, 'journeyCut'));
    expect(after.stamps).toBe(3);
    expect(after.stampsEarned).toBe(5);
    expect(globalMultiplier(after)).toBe(globalMultiplier(before));
  });
});

describe('caps, at the boundary level and one past it (AC5)', () => {
  it.each<[number, number]>([
    [0, 1],
    [1, 0.95],
    [7, 0.65],
    [8, 0.6],
    [9, 0.6],
    [20, 0.6],
  ])('Encounter cost at discount level %i is x%d', (level, want) => {
    expect(
      encounterCostFactor(holding({ upgrades: { encounterDiscount: level } })),
    ).toBeCloseTo(want, 14);
  });

  it.each<[number, number]>([
    [0, 1],
    [1, 0.9],
    [2, 0.8],
    [3, 0.7],
    [4, 0.7],
  ])('journey duration at cut level %i is x%d', (level, want) => {
    expect(
      journeyDurationFactor(holding({ upgrades: { journeyCut: level } })),
    ).toBeCloseTo(want, 14);
  });

  it.each<[number, number]>([
    [0, 24 * HOUR_MS],
    [1, 48 * HOUR_MS],
    [2, 72 * HOUR_MS],
    [3, 72 * HOUR_MS],
  ])('the offline cap at level %i is %i ms', (level, want) => {
    expect(offlineCapMs(holding({ upgrades: { offlineCap: level } }))).toBe(
      want,
    );
  });

  it.each<[Record<string, number>, number]>([
    [{}, 1],
    [{ journeySlot2: 1 }, 2],
    [{ journeySlot2: 1, journeySlot3: 1 }, 3],
    [{ journeySlot2: 2, journeySlot3: 2 }, 3],
  ])('journey slots with %j are %i', (upgrades, want) => {
    expect(journeySlots(holding({ upgrades }))).toBe(want);
  });

  it.each<[Record<string, number>, readonly number[]]>([
    [{}, [10_000]],
    [{ pemanduFaster1: 1 }, [10_000, 5_000]],
    [{ pemanduFaster1: 1, pemanduFaster2: 1 }, [10_000, 5_000, 2_000]],
    [
      { pemanduFaster1: 1, pemanduFaster2: 1, pemanduFaster3: 1 },
      [10_000, 5_000, 2_000, 1_000],
    ],
  ])('Pemandu intervals with %j are %j', (upgrades, want) => {
    expect(pemanduIntervalsMs(holding({ upgrades }))).toEqual(want);
  });

  it.each<[string, number]>([
    ['encounterDiscount', 8],
    ['journeyCut', 3],
    ['offlineCap', 2],
    ['journeySlot3', 1],
  ])('%s can be bought up to level %i', (id, last) => {
    const requires = entry(id).requires;
    const before = holding({
      insight: 1_000,
      stamps: 1_000,
      upgrades: {
        [id]: last - 1,
        ...(requires === undefined ? {} : { [requires]: 1 }),
      },
    });
    expect(upgradeLevel(ok(buyUpgrade(course, before, id)), id)).toBe(last);
  });

  it.each<[string, number]>([
    ['encounterDiscount', 8],
    ['journeyCut', 3],
    ['offlineCap', 2],
    ['journeySlot3', 1],
    ['startingUnderstanding', 5],
  ])('%s is refused one past level %i', (id, last) => {
    const requires = entry(id).requires;
    const before = holding({
      insight: 1_000,
      stamps: 1_000,
      upgrades: {
        [id]: last,
        ...(requires === undefined ? {} : { [requires]: 1 }),
      },
    });
    expect(buyUpgrade(course, before, id)).toEqual({
      ok: false,
      rejection: { kind: 'upgradeMaxed', id, level: last },
    });
  });
});

describe('each capped upgrade reaches its cap at its last level, not before (AC5)', () => {
  it('Encounter discount', () => {
    const discount = BALANCE.stamps.costs.encounterDiscount.length;
    const at = (level: number): number =>
      encounterCostFactor(holding({ upgrades: { encounterDiscount: level } }));
    expect(at(discount)).toBeCloseTo(1 - BALANCE.stamps.costDiscountCap, 14);
    expect(at(discount - 1)).toBeGreaterThan(at(discount) + 0.01);
  });

  it('journey cut', () => {
    const cut = BALANCE.stamps.costs.journeyCut.length;
    const at = (level: number): number =>
      journeyDurationFactor(holding({ upgrades: { journeyCut: level } }));
    expect(at(cut)).toBeCloseTo(1 - BALANCE.stamps.journeyCutCap, 14);
    expect(at(cut - 1)).toBeGreaterThan(at(cut) + 0.01);
  });

  it('offline cap', () => {
    const cap = BALANCE.insightUpgrades.costs.offlineCap.length;
    const at = (level: number): number =>
      offlineCapMs(holding({ upgrades: { offlineCap: level } }));
    expect(at(cap)).toBe(BALANCE.offline.maxCapMs);
    expect(at(cap - 1)).toBeLessThan(BALANCE.offline.maxCapMs);
  });

  it('journey slots', () => {
    expect(
      journeySlots(holding({ upgrades: { journeySlot2: 1, journeySlot3: 1 } })),
    ).toBe(BALANCE.journeys.maxSlots);
  });

  it('Pemandu intervals: one tier per interval after the first', () => {
    const all = { pemanduFaster1: 1, pemanduFaster2: 1, pemanduFaster3: 1 };
    expect(pemanduIntervalsMs(holding({ upgrades: all }))).toEqual(
      BALANCE.automation.intervalsMs,
    );
  });
});

describe('buyUpgrade (AC3)', () => {
  it.each([...PROTOTYPE_NAMES, 'phrasebook:transport', 'phrasebook:', ''])(
    'refuses the unknown id %j and leaves state unchanged',
    (id) => {
      const before = holding({ insight: 1_000, stamps: 1_000 });
      const json = JSON.stringify(before);
      expect(buyUpgrade(course, before, id)).toEqual({
        ok: false,
        rejection: { kind: 'unknownUpgrade', id },
      });
      expect(JSON.stringify(before)).toBe(json);
    },
  );

  it.each(PROTOTYPE_NAMES)('reads level 0 for %s', (id) => {
    expect(upgradeLevel(holding({}), id)).toBe(0);
  });

  it('refuses an Insight upgrade 0.01 short', () => {
    const before = holding({ insight: 24.99, stamps: 1_000 });
    expect(buyUpgrade(course, before, 'journeySlot2')).toEqual({
      ok: false,
      rejection: {
        kind: 'upgradeUnaffordable',
        id: 'journeySlot2',
        currency: 'insight',
        cost: Num.toTuple(Num.from(25)),
        held: Num.toTuple(Num.from(24.99)),
      },
    });
  });

  it('refuses a stamp upgrade one stamp short, whatever Insight is held', () => {
    const before = holding({ insight: 1_000, stamps: 1 });
    expect(buyUpgrade(course, before, 'journeyCut')).toEqual({
      ok: false,
      rejection: {
        kind: 'upgradeUnaffordable',
        id: 'journeyCut',
        currency: 'stamps',
        cost: Num.toTuple(Num.from(2)),
        held: Num.toTuple(Num.from(1)),
      },
    });
  });

  it('prices the second offline cap level at its own cost', () => {
    const before = holding({ insight: 119, upgrades: { offlineCap: 1 } });
    expect(buyUpgrade(course, before, 'offlineCap')).toEqual({
      ok: false,
      rejection: {
        kind: 'upgradeUnaffordable',
        id: 'offlineCap',
        currency: 'insight',
        cost: Num.toTuple(Num.from(120)),
        held: Num.toTuple(Num.from(119)),
      },
    });
  });

  it.each<[string, string]>([
    ['journeySlot3', 'journeySlot2'],
    ['pemanduFaster2', 'pemanduFaster1'],
    ['pemanduFaster3', 'pemanduFaster2'],
  ])('refuses %s before %s', (id, requires) => {
    const before = holding({ insight: 1_000 });
    expect(buyUpgrade(course, before, id)).toEqual({
      ok: false,
      rejection: { kind: 'upgradePrerequisite', id, requires },
    });
  });

  it('names the missing prerequisite before the missing Insight', () => {
    expect(buyUpgrade(course, holding({}), 'journeySlot3')).toEqual({
      ok: false,
      rejection: {
        kind: 'upgradePrerequisite',
        id: 'journeySlot3',
        requires: 'journeySlot2',
      },
    });
  });

  it('names the maxed level before the missing stamps', () => {
    expect(
      buyUpgrade(
        course,
        holding({ upgrades: { pemanduEarly: 1 } }),
        'pemanduEarly',
      ),
    ).toEqual({
      ok: false,
      rejection: { kind: 'upgradeMaxed', id: 'pemanduEarly', level: 1 },
    });
  });

  it('buys with exactly the cost, leaving 0 Insight', () => {
    const after = ok(
      buyUpgrade(course, holding({ insight: 25 }), 'journeySlot2'),
    );
    expect(after.insight).toEqual(Num.toTuple(Num.from(0)));
    expect(upgradeLevel(after, 'journeySlot2')).toBe(1);
  });

  it('spends Insight and leaves stamps, Understanding and Encounters alone', () => {
    const before = holding({ insight: 50, stamps: 4, owned: { tea: 3 } });
    const after = ok(buyUpgrade(course, before, 'phrasebook:food'));
    expect(after.insight).toEqual(Num.toTuple(Num.from(30)));
    expect(after.stamps).toBe(4);
    expect(after.stampsEarned).toBe(4);
    expect(after.owned).toEqual({ tea: 3 });
    expect(after.upgrades).toEqual({ 'phrasebook:food': 1 });
  });

  it('spends stamps and leaves Insight alone', () => {
    const before = holding({
      insight: 7,
      stamps: 6,
      upgrades: { encounterDiscount: 2 },
    });
    const after = ok(buyUpgrade(course, before, 'encounterDiscount'));
    expect(after.stamps).toBe(4);
    expect(after.insight).toEqual(Num.toTuple(Num.from(7)));
    expect(after.upgrades).toEqual({ encounterDiscount: 3 });
  });

  it('banks production up to the purchase: the anchor moves to now, holding the same Understanding', () => {
    const before = holding({
      insight: 100,
      owned: { tea: 10 },
      leadMs: 90_000,
    });
    const after = ok(buyUpgrade(course, before, 'journeySlot2'));
    expect(after.anchor.sim).toBe(before.sim);
    expect(Num.toTuple(understandingNow(course, after))).toEqual(
      Num.toTuple(understandingNow(course, before)),
    );
  });

  it('round-trips through JSON after a purchase', () => {
    const after = ok(
      buyUpgrade(course, holding({ insight: 100 }), 'journeySlot2'),
    );
    expect(JSON.parse(JSON.stringify(after))).toEqual(after);
  });
});
