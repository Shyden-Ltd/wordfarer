import { describe, expect, it } from 'vitest';
import type { CourseData, LexiconItem } from '../src/course';
import {
  BOT_EPOCH_WALL_MS,
  syntheticCourse,
} from '../fixtures/synthetic-course';

/**
 * The synthetic course (#26 AC8, AC9): sized like v1 and reproducible from a
 * seed. Counts are taken by content, so an empty id or an unused tag cannot
 * pass as an entry.
 */

// Built on first use inside a test, so a generator that throws fails each
// test on its own rather than the whole file at collection.
let cached: CourseData | undefined;
const course = (): CourseData => (cached ??= syntheticCourse(1));

const nonEmpty = (ids: readonly string[]) =>
  ids.filter((id) => id.trim() !== '');

function allItems(c: CourseData): LexiconItem[] {
  return c.regions.flatMap((r) => [
    ...r.destinations.flatMap((d) => d.lexicon),
    ...r.grammarNodes.flatMap((g) => g.derived),
  ]);
}

describe('syntheticCourse', () => {
  it('gives a deep-equal course for the same seed, and plain JSON data', () => {
    expect(syntheticCourse(1)).toEqual(course());
    expect(JSON.parse(JSON.stringify(course()))).toEqual(course());
  });

  it('varies with the seed beyond its id', () => {
    expect(syntheticCourse(2).regions).not.toEqual(course().regions);
  });

  it('has 3 regions of 4 destinations, 150 lexicon items, 6 Encounters, 12 cards in sets and 4 grammar nodes', () => {
    expect(nonEmpty(course().regions.map((r) => r.id))).toHaveLength(3);
    for (const r of course().regions) {
      expect(nonEmpty(r.destinations.map((d) => d.id)), r.id).toHaveLength(4);
      expect(
        nonEmpty(r.destinations.flatMap((d) => d.lexicon.map((w) => w.id))),
        r.id,
      ).toHaveLength(150);
      expect(nonEmpty(r.encounters.map((e) => e.id)), r.id).toHaveLength(6);
      expect(nonEmpty(r.cultureCards.map((c) => c.id)), r.id).toHaveLength(12);
      expect(nonEmpty(r.grammarNodes.map((g) => g.id)), r.id).toHaveLength(4);
      const sets = new Set(r.cardSets.map((s) => s.id));
      expect(nonEmpty([...sets]).length, r.id).toBeGreaterThanOrEqual(2);
      for (const card of r.cultureCards)
        expect(sets.has(card.setId), card.id).toBe(true);
      for (const set of sets) {
        expect(
          r.cultureCards.filter((c) => c.setId === set).length,
          set,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('uses 10 tags, each on at least one Encounter and one item, and no other tag', () => {
    expect(nonEmpty(course().tags)).toHaveLength(10);
    expect(new Set(course().tags).size).toBe(10);
    const onEncounters = new Set(
      course().regions.flatMap((r) => r.encounters.flatMap((e) => e.tags)),
    );
    const onItems = new Set(allItems(course()).flatMap((w) => w.tags));
    const onCards = new Set(
      course().regions.flatMap((r) => r.cultureCards.flatMap((c) => c.tags)),
    );
    for (const t of course().tags) {
      expect(onEncounters.has(t), `${t} on an Encounter`).toBe(true);
      expect(onItems.has(t), `${t} on an item`).toBe(true);
    }
    for (const t of [...onEncounters, ...onItems, ...onCards]) {
      expect(course().tags, t).toContain(t);
    }
  });

  it('gives every lexicon item, Encounter and card a unique id', () => {
    const ids = [
      ...allItems(course()).map((w) => w.id),
      ...course().regions.flatMap((r) => r.encounters.map((e) => e.id)),
      ...course().regions.flatMap((r) => r.cultureCards.map((c) => c.id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(3 * (150 + 12 + 6 + 12));
  });

  it('orders each destination A1 first, and gives every grammar root words to multiply', () => {
    const rank = { A1: 0, A2: 1, B1: 2 } as const;
    for (const r of course().regions) {
      for (const d of r.destinations) {
        const levels = d.lexicon.map((w) => rank[w.cefr]);
        expect(levels, d.id).toEqual([...levels].sort((a, b) => a - b));
        expect(levels[0], d.id).toBe(0);
      }
      const rootsInLexicon = new Set(
        r.destinations.flatMap((d) =>
          d.lexicon.flatMap((w) => (w.root === undefined ? [] : [w.root])),
        ),
      );
      for (const node of r.grammarNodes) {
        expect(node.roots.length, node.id).toBeGreaterThan(0);
        expect(
          nonEmpty(node.derived.map((w) => w.id)).length,
          node.id,
        ).toBeGreaterThan(0);
        for (const root of node.roots)
          expect(rootsInLexicon.has(root), `${node.id} ${root}`).toBe(true);
      }
    }
  });

  it('prices Encounters positively and ascending within a region', () => {
    for (const r of course().regions) {
      const c0 = r.encounters.map((e) => e.c0);
      expect(
        c0.every((c) => c > 0) && r.encounters.every((e) => e.p0 > 0),
        r.id,
      ).toBe(true);
      expect(c0, r.id).toEqual([...c0].sort((a, b) => a - b));
    }
  });

  it('places festival windows on the bot calendar, as integer half-open wall-clock spans', () => {
    const windows = course().regions.flatMap((r) =>
      r.cultureCards.flatMap((c) => c.festival?.windows ?? []),
    );
    expect(windows.length).toBeGreaterThan(0);
    for (const w of windows) {
      expect(
        Number.isSafeInteger(w.startWallMs) &&
          Number.isSafeInteger(w.endWallMs),
      ).toBe(true);
      expect(w.startWallMs).toBeGreaterThanOrEqual(BOT_EPOCH_WALL_MS);
      expect(w.endWallMs).toBeGreaterThan(w.startWallMs);
    }
  });
});
