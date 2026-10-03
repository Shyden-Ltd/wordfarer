import { describe, expect, it } from 'vitest';
import { simMs, wallMs, type WallMs } from '../src/clock';
import type { CourseData, Destination, Region } from '../src/course';
import { automationOpensAt, automationUnlocked } from '../src/automation';
import { newWordMemory, type WordMemory } from '../src/memory';
import { Num, type NumTuple } from '../src/num';
import { understandingNow } from '../src/production';
import { setSail } from '../src/sail';
import { setAutomation, type Rejection, type Result } from '../src/sim';
import { initialState, type GameState } from '../src/state';

/**
 * Pemandu automation (#33): the unlock and the setting (AC1).
 *
 * The course is declared here, so it is checked against the `CourseData`
 * contract rather than sharing it. Its route numbers destinations 0 to 3 in
 * region 1, 4 to 7 in region 2 and 8 to 11 in region 3, so Pemandu opens at
 * destination 4, or 3 with the stamp upgrade. The opening region and the
 * intervals are written out as literals, so a change to `BALANCE.automation`
 * fails here as well as in its own pin.
 */

const START: WallMs = wallMs(Date.UTC(2027, 0, 4));

function destination(r: number, d: number): Destination {
  const id = `r${String(r)}-d${String(d)}`;
  return {
    id,
    lexicon: Array.from({ length: 20 }, (_, k) => ({
      id: `${id}-w${String(k)}`,
      tags: ['food'],
      cefr: 'A1' as const,
    })),
  };
}

function region(r: number): Region {
  return {
    id: `r${String(r)}`,
    destinations: [0, 1, 2, 3].map((d) => destination(r, d)),
    encounters: [
      { id: `tea${String(r)}`, tags: ['food'], c0: 10, p0: 1 },
      { id: `market${String(r)}`, tags: ['food'], c0: 100, p0: 8 },
    ],
    cardSets: [],
    cultureCards: [],
    grammarNodes: [],
  };
}

const course: CourseData = {
  id: 'automation-course',
  tags: ['food'],
  regions: [region(0), region(1), region(2)],
};

/** Region 1 only: Pemandu never opens on it. */
const oneRegion: CourseData = { ...course, regions: [region(0)] };

/** Region 2 has no destinations, so the first one past region 1 is region 3's. */
const hollow: CourseData = {
  ...course,
  regions: [region(0), { ...region(1), destinations: [] }, region(2)],
};

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function tuple(x: number): NumTuple {
  return Num.toTuple(Num.from(x));
}

interface At {
  readonly upgrades?: Readonly<Record<string, number>>;
  readonly owned?: Readonly<Record<string, number>>;
  readonly held?: number;
  readonly simMs?: number;
  readonly words?: Readonly<Record<string, WordMemory>>;
}

/** A game that has reached destination `reached` and stands there. */
function at(reached: number, opts: At = {}): GameState {
  const base = initialState(START, 1);
  const sim = simMs(opts.simMs ?? 0);
  return deepFreeze({
    ...base,
    sim,
    wall: wallMs(START + sim),
    anchor: { sim: simMs(0), understanding: tuple(opts.held ?? 0) },
    owned: opts.owned ?? {},
    upgrades: opts.upgrades ?? {},
    words: opts.words ?? {},
    destination: reached,
    reached,
  });
}

function ok(result: Result): GameState {
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result)}`);
  return result.state;
}

function refused(result: Result): Rejection {
  if (result.ok) throw new Error('expected a rejection');
  return result.rejection;
}

const EARLY = { pemanduEarly: 1 };
const ALL_TIERS = { pemanduFaster1: 1, pemanduFaster2: 1, pemanduFaster3: 1 };

describe('the automation setting in state (AC1)', () => {
  it('a new game has Pemandu off at the starting 10 s interval', () => {
    expect(initialState(START, 1).automation).toEqual({
      enabled: false,
      intervalMs: 10_000,
    });
  });

  it('a sail keeps the setting', () => {
    // Destination 4's goal: 1e4 x 10^4 Understanding and 8 + 2 x 4 words.
    const words = Object.fromEntries(
      Array.from({ length: 16 }, (_, k) => [
        `r1-d0-w${String(k)}`,
        newWordMemory(START),
      ]),
    );
    const on = ok(
      setAutomation(course, at(4, { held: 1e8, words }), true, 10_000),
    );
    const sailed = ok(setSail(course, on));
    expect(sailed.destination).toBe(5);
    expect(sailed.automation).toEqual({ enabled: true, intervalMs: 10_000 });
  });
});

describe('where Pemandu opens (AC1)', () => {
  it.each([
    ['region 2, without the stamp upgrade', course, {}, 4],
    ['one destination earlier, with it', course, EARLY, 3],
    ['region 3 when region 2 has no destinations', hollow, {}, 4],
    ['never on a course with one region', oneRegion, {}, undefined],
    [
      'never on a course with one region, even early',
      oneRegion,
      EARLY,
      undefined,
    ],
  ] as const)('%s', (_label, c, upgrades, want) => {
    expect(automationOpensAt(c, at(0, { upgrades }))).toBe(want);
  });

  it.each([
    ['locked at destination 3', 3, {}, false],
    ['open at destination 4, region 2', 4, {}, true],
    ['open at destination 11, region 3', 11, {}, true],
    ['open at destination 3 with the stamp upgrade', 3, EARLY, true],
    ['locked at destination 2 even with it', 2, EARLY, false],
  ] as const)('%s', (_label, reached, upgrades, want) => {
    expect(automationUnlocked(course, at(reached, { upgrades }))).toBe(want);
  });

  it('stays open after a replay of an earlier destination', () => {
    const replaying = { ...at(6), destination: 1 };
    expect(automationUnlocked(course, replaying)).toBe(true);
  });

  it.each([
    ['without the stamp upgrade', {}],
    ['with it', EARLY],
  ] as const)(
    'is locked on a course with one region, %s',
    (_label, upgrades) => {
      expect(automationUnlocked(oneRegion, at(3, { upgrades }))).toBe(false);
    },
  );
});

describe('setAutomation (AC1)', () => {
  it.each([
    ['turning it on', true],
    ['turning it off', false],
  ] as const)('refuses %s before Pemandu opens', (_label, enabled) => {
    expect(refused(setAutomation(course, at(3), enabled, 10_000))).toEqual({
      kind: 'automationLocked',
      reached: 3,
    });
  });

  it('refuses a locked Pemandu before judging the interval', () => {
    expect(refused(setAutomation(course, at(3), true, 3_000)).kind).toBe(
      'automationLocked',
    );
  });

  it('turns Pemandu on at the starting interval once open', () => {
    const s = ok(setAutomation(course, at(4), true, 10_000));
    expect(s.automation).toEqual({ enabled: true, intervalMs: 10_000 });
  });

  it('opens one destination early with the stamp upgrade', () => {
    const s = ok(
      setAutomation(course, at(3, { upgrades: EARLY }), true, 10_000),
    );
    expect(s.automation.enabled).toBe(true);
  });

  it('turns Pemandu off and keeps the interval chosen', () => {
    const on = ok(
      setAutomation(course, at(4, { upgrades: ALL_TIERS }), true, 2_000),
    );
    expect(ok(setAutomation(course, on, false, 2_000)).automation).toEqual({
      enabled: false,
      intervalMs: 2_000,
    });
  });

  it.each([
    ['5 s with its tier', { pemanduFaster1: 1 }, 5_000],
    ['2 s with its tier', { pemanduFaster1: 1, pemanduFaster2: 1 }, 2_000],
    ['1 s with every tier', ALL_TIERS, 1_000],
    ['10 s with every tier', ALL_TIERS, 10_000],
  ] as const)('accepts %s', (_label, upgrades, intervalMs) => {
    const s = ok(setAutomation(course, at(4, { upgrades }), true, intervalMs));
    expect(s.automation.intervalMs).toBe(intervalMs);
  });

  it.each([
    ['5 s without its tier', {}, 5_000, [10_000]],
    [
      '1 s with only the first tier',
      { pemanduFaster1: 1 },
      1_000,
      [10_000, 5_000],
    ],
    [
      '3 s, which no tier gives',
      ALL_TIERS,
      3_000,
      [10_000, 5_000, 2_000, 1_000],
    ],
    ['0 ms', ALL_TIERS, 0, [10_000, 5_000, 2_000, 1_000]],
    ['-10 s', ALL_TIERS, -10_000, [10_000, 5_000, 2_000, 1_000]],
    ['NaN', ALL_TIERS, Number.NaN, [10_000, 5_000, 2_000, 1_000]],
  ] as const)('refuses %s', (_label, upgrades, intervalMs, owned) => {
    expect(
      refused(setAutomation(course, at(4, { upgrades }), true, intervalMs)),
    ).toEqual({ kind: 'intervalNotOwned', intervalMs, owned });
  });

  it('refuses an interval not owned when turning Pemandu off too', () => {
    expect(refused(setAutomation(course, at(4), false, 5_000)).kind).toBe(
      'intervalNotOwned',
    );
  });

  it('banks production first, so ticks start after the setting', () => {
    const s = at(4, { owned: { tea0: 3 }, held: 7, simMs: 90_000 });
    const before = understandingNow(course, s);
    const on = ok(setAutomation(course, s, true, 10_000));
    expect(on.anchor.sim).toBe(90_000);
    expect(on.anchor.understanding).toEqual(Num.toTuple(before));
    expect(Num.toNumber(before)).toBe(7 + 3 * 90);
  });

  it('changes nothing else', () => {
    const s = at(4, { owned: { tea0: 3 }, held: 7, simMs: 90_000 });
    const on = ok(setAutomation(course, s, true, 10_000));
    expect({ ...on, anchor: s.anchor, automation: s.automation }).toEqual(s);
  });
});
