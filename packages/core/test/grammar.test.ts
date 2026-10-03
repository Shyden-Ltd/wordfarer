import { describe, expect, it } from 'vitest';
import { HOUR_MS, wallMs, type WallMs } from '../src/clock';
import type {
  CourseData,
  Destination,
  GrammarNode,
  LexiconItem,
  Region,
} from '../src/course';
import { grammarNodeCost } from '../src/grammar';
import { Num, type NumTuple } from '../src/num';
import { understandingNow } from '../src/production';
import {
  buyGrammarNode,
  integrate,
  type Rejection,
  type Result,
} from '../src/sim';
import { initialState, type GameState } from '../src/state';

/**
 * Grammar nodes (#32 AC1 to AC4): buying one, the words it multiplies, the
 * derived words it teaches, its breakdown line, and that a sail keeps it.
 *
 * The course is declared here, so it is checked against the `CourseData`
 * contract rather than sharing it. The cost curve is written out as literals
 * (50 x 1.5^n Insight, open from region 2), so a change to `BALANCE.grammar`
 * fails here as well as in its own pin.
 */

const START: WallMs = wallMs(Date.UTC(2027, 0, 4));

function word(
  id: string,
  tags: readonly string[],
  cefr: LexiconItem['cefr'],
  root?: string,
): LexiconItem {
  return { id, tags, cefr, ...(root === undefined ? {} : { root }) };
}

/** Region 1's first destination holds the roots; every other one is filler. */
function destination(r: number, d: number): Destination {
  const id = `r${String(r)}-d${String(d)}`;
  if (r === 0 && d === 0) {
    return {
      id,
      lexicon: [
        word('ajar', ['food'], 'A1', 'ajar'),
        word('makan', ['food'], 'A1', 'makan'),
        word('teh', ['food'], 'A1'),
        word('jalan', ['travel'], 'A1', 'jalan'),
      ],
    };
  }
  return {
    id,
    lexicon: [0, 1, 2].map((k) => word(`${id}-w${String(k)}`, ['food'], 'A1')),
  };
}

/** ber- and me- in region 1, di- in region 2, -kan in region 3. */
const NODES: readonly (readonly GrammarNode[])[] = [
  [
    {
      id: 'ber-',
      roots: ['ajar'],
      derived: [word('belajar', ['food'], 'A2', 'ajar')],
    },
    {
      id: 'me-',
      roots: ['ajar', 'makan'],
      derived: [
        word('mengajar', ['food'], 'A1', 'ajar'),
        word('memakan', ['food'], 'B1', 'makan'),
      ],
    },
  ],
  [
    {
      id: 'di-',
      roots: ['makan'],
      derived: [word('dimakan', ['travel'], 'A1', 'makan')],
    },
  ],
  [
    {
      id: '-kan',
      roots: ['jalan'],
      derived: [word('jalankan', ['travel'], 'A2', 'jalan')],
    },
  ],
];

function region(r: number): Region {
  return {
    id: `r${String(r)}`,
    destinations: [0, 1, 2, 3].map((d) => destination(r, d)),
    encounters: [
      { id: `food${String(r)}`, tags: ['food'], c0: 10, p0: 1 },
      { id: `travel${String(r)}`, tags: ['travel'], c0: 10, p0: 1 },
    ],
    cardSets: [],
    cultureCards: [],
    grammarNodes: NODES[r] ?? [],
  };
}

const course: CourseData = {
  id: 'grammar-course',
  tags: ['food', 'travel'],
  regions: [region(0), region(1), region(2)],
};

function tuple(x: number): NumTuple {
  return Num.toTuple(Num.from(x));
}

/**
 * A state at destination `at` (4 per region: 4 is region 2's first), having
 * reached it, holding `insight`, owning `grammar`, with one of each region-1
 * Encounter producing for an hour.
 */
function stateAt(
  at: number,
  insight: number,
  grammar: readonly string[] = [],
): GameState {
  const base = initialState(START, 1);
  return integrate(
    {
      ...base,
      destination: at,
      reached: at,
      insight: tuple(insight),
      grammar,
      owned: { food0: 1, travel0: 1 },
    },
    HOUR_MS,
  );
}

function ok(result: Result): GameState {
  if (!result.ok) throw new Error(`rejected: ${result.rejection.kind}`);
  return result.state;
}

function rejected(result: Result): Rejection {
  if (result.ok) throw new Error('expected a rejection');
  return result.rejection;
}

describe('grammarNodeCost (#32 AC1)', () => {
  it.each([
    [0, 50],
    [1, 75],
    [2, 112.5],
    [3, 168.75],
  ])('costs %i owned -> %d Insight', (owned, cost) => {
    expect(Num.toNumber(grammarNodeCost(owned))).toBe(cost);
  });

  it.each([-1, 1.5, Number.NaN])('refuses %s nodes owned', (owned) => {
    expect(() => grammarNodeCost(owned)).toThrow(
      /owned must be a safe non-negative integer/,
    );
  });
});

describe('buyGrammarNode (#32 AC1)', () => {
  it('buys a region-1 node at region 2, paying 50 Insight', () => {
    const s = stateAt(4, 60);
    const out = ok(buyGrammarNode(course, s, 'ber-'));
    expect(out.grammar).toEqual(['ber-']);
    expect(Num.toNumber(Num.fromTuple(out.insight))).toBe(10);
  });

  it('buys a region-2 node at region 2', () => {
    expect(ok(buyGrammarNode(course, stateAt(4, 60), 'di-')).grammar).toEqual([
      'di-',
    ]);
  });

  it('prices the next node by the nodes owned: the second costs 75', () => {
    const out = ok(buyGrammarNode(course, stateAt(4, 80, ['ber-']), 'me-'));
    expect(out.grammar).toEqual(['ber-', 'me-']);
    expect(Num.toNumber(Num.fromTuple(out.insight))).toBe(5);
  });

  it('buys with exactly the cost held', () => {
    const out = ok(buyGrammarNode(course, stateAt(4, 50), 'ber-'));
    expect(out.insight).toEqual(tuple(0));
  });

  it('banks production up to the purchase at the rates before it', () => {
    const s = stateAt(4, 60);
    const out = ok(buyGrammarNode(course, s, 'ber-'));
    expect(out.anchor).toEqual({
      sim: s.sim,
      understanding: Num.toTuple(understandingNow(course, s)),
    });
    // Liveness: an hour of two Encounters produced something to bank.
    expect(Num.toNumber(understandingNow(course, s))).toBeGreaterThan(0);
  });

  it('changes only the anchor, Insight and grammar', () => {
    const s = stateAt(4, 60);
    const out = ok(buyGrammarNode(course, s, 'ber-'));
    const changed = ['anchor', 'insight', 'grammar'];
    const kept = Object.keys(s).filter((k) => !changed.includes(k));
    // Measured 18 of the state's 21 keys at #32.
    expect(kept.length).toBeGreaterThan(17);
    expect(
      Object.fromEntries(kept.map((k) => [k, out[k as keyof GameState]])),
    ).toEqual(
      Object.fromEntries(kept.map((k) => [k, s[k as keyof GameState]])),
    );
  });

  it('refuses a node the course does not have', () => {
    expect(rejected(buyGrammarNode(course, stateAt(4, 60), 'pe-an'))).toEqual({
      kind: 'unknownGrammarNode',
      id: 'pe-an',
    });
  });

  it('refuses an inherited property name as a node id', () => {
    expect(
      rejected(buyGrammarNode(course, stateAt(4, 60), 'constructor')),
    ).toEqual({ kind: 'unknownGrammarNode', id: 'constructor' });
  });

  it('refuses a node already owned', () => {
    expect(
      rejected(buyGrammarNode(course, stateAt(4, 600, ['ber-']), 'ber-')),
    ).toEqual({ kind: 'grammarNodeOwned', id: 'ber-' });
  });

  it('refuses every node in region 1: grammar opens at region 2', () => {
    expect(rejected(buyGrammarNode(course, stateAt(3, 60), 'ber-'))).toEqual({
      kind: 'grammarNodeLocked',
      id: 'ber-',
      region: 0,
      regionsReached: 1,
    });
  });

  it('refuses a node whose own region is not reached', () => {
    expect(rejected(buyGrammarNode(course, stateAt(7, 60), '-kan'))).toEqual({
      kind: 'grammarNodeLocked',
      id: '-kan',
      region: 2,
      regionsReached: 2,
    });
  });

  it('buys a region-3 node once region 3 is reached', () => {
    expect(ok(buyGrammarNode(course, stateAt(8, 60), '-kan')).grammar).toEqual([
      '-kan',
    ]);
  });

  it('refuses a node the player cannot pay for, naming cost and Insight', () => {
    expect(
      rejected(buyGrammarNode(course, stateAt(4, 74, ['ber-']), 'me-')),
    ).toEqual({
      kind: 'grammarNodeUnaffordable',
      id: 'me-',
      cost: tuple(75),
      held: tuple(74),
    });
  });

  it.each<[string, GameState, string, Rejection['kind']]>([
    [
      'owned before locked',
      stateAt(3, 0, ['ber-']),
      'ber-',
      'grammarNodeOwned',
    ],
    [
      'owned before unaffordable',
      stateAt(4, 0, ['ber-']),
      'ber-',
      'grammarNodeOwned',
    ],
    ['locked before unaffordable', stateAt(3, 0), 'me-', 'grammarNodeLocked'],
  ])('checks %s', (_, s, id, kind) => {
    expect(rejected(buyGrammarNode(course, s, id)).kind).toBe(kind);
  });
});
