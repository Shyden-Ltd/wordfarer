import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loopedCases, type LoopedCase } from './one-test-per-case';
import { trackedFiles } from './tracked-files';

/**
 * One test per case (operator, 2026-10-02; Refs #58).
 *
 * A population known before the run (inputs, fixtures, methods, functions,
 * engines) is covered by generating one test per case, never by looping it
 * inside one test body. A loop inside shares one time budget across every
 * case, stops at the first failing case and hides the rest, and its title
 * names no case.
 *
 * The question asked is STRUCTURAL: does a loop inside a test assert, or
 * change page state, on each pass? Whether its population was "known before
 * the run" is a dataflow question no detector answers well. Two loops are
 * allowed inside a test, each declared in a line comment directly above it
 * with its reason: `// runtime population: <why>` for a loop over what the
 * code under test produced, and `// one scenario: <why>` for a loop whose
 * passes carry state into the next. Comments are found by position, so the
 * same words in a string do not count.
 */
const found = (source: string): readonly LoopedCase[] =>
  loopedCases(source, 'fixture.test.ts');

/** A fixture whose loop sits on line 3, inside a test titled `t`. */
const inTest = (loop: string): string => `
it('t', () => {
  ${loop}
});`;

describe('the detector', () => {
  it('reports a loop inside a test that asserts on each pass, with its title, header and line', () => {
    expect(
      found(`
it('every case', () => {
  for (const c of CASES) {
    expect(f(c)).toBe(1);
  }
});`),
    ).toEqual([
      { test: 'every case', loop: 'for (const c of CASES)', line: 3 },
    ]);
  });

  const LOOP_KINDS: readonly (readonly [string, string])[] = [
    ['for (const c of CASES)', 'for (const c of CASES) expect(c).toBe(1);'],
    ['for (const k in TABLE)', 'for (const k in TABLE) expect(k).toBe(1);'],
    [
      'for (let i = 0; i < 3; i++)',
      'for (let i = 0; i < 3; i++) expect(i).toBe(1);',
    ],
    ['while (i < 3)', 'while (i < 3) expect(i++).toBe(1);'],
    ['do … while (i < 3)', 'do expect(i++).toBe(1); while (i < 3);'],
    ['CASES.forEach(…)', 'CASES.forEach((c) => expect(c).toBe(1));'],
    ['CASES.map(…)', 'CASES.map((c) => expect(c).toBe(1));'],
    ['CASES.every(…)', 'CASES.every(function (c) { expect(c).toBe(1); });'],
    ['CASES.some(…)', 'CASES.some((c) => { expect(c).toBe(1); });'],
  ];
  for (const [header, loop] of LOOP_KINDS)
    it(`reports the loop form ${header}`, () => {
      expect(found(inTest(loop))).toEqual([
        { test: 't', loop: header, line: 3 },
      ]);
    });

  const PER_PASS_CALLS: readonly string[] = [
    'expect(c).toBe(1)',
    'expect.soft(c).toBe(1)',
    'expect(c).not.toBe(1)',
    'await expect(page).toHaveTitle(c)',
    'await page.goto(c)',
    'await page.setViewportSize(c)',
    'await page.emulateMedia(c)',
    'await page.reload()',
    'await page.setContent(c)',
    'await browser.newPage()',
    'await browser.newContext()',
  ];
  for (const call of PER_PASS_CALLS)
    it(`reports a loop that calls ${call} on each pass`, () => {
      expect(
        found(`
test('t', async ({ page, browser }) => {
  for (const c of CASES) {
    ${call};
  }
});`),
      ).toEqual([{ test: 't', loop: 'for (const c of CASES)', line: 3 }]);
    });

  const TEST_CALLS: readonly string[] = [
    'it',
    'test',
    'it.only',
    'it.skip',
    'it.fails',
    'it.concurrent',
    'test.only',
    'test.skip',
    'test.fixme',
    'test.fail',
    'test.slow',
    'it.for(XS)',
    'it.each(XS)',
    'test.each(XS)',
  ];
  for (const call of TEST_CALLS)
    it(`looks inside ${call}(…)`, () => {
      expect(
        found(`
${call}('t', () => {
  for (const c of CASES) expect(c).toBe(1);
});`),
      ).toEqual([{ test: 't', loop: 'for (const c of CASES)', line: 3 }]);
    });

  const SIGNATURES: readonly (readonly [string, string, string])[] = [
    ['options before the body', "it('t', { timeout: 60_000 }, () => {", '});'],
    ['a timeout after the body', "it('t', () => {", '}, 60_000);'],
    ['options after the body', "it('t', () => {", '}, { timeout: 60_000 });'],
  ];
  for (const [what, open, close] of SIGNATURES)
    it(`finds the body of a test given ${what}`, () => {
      expect(
        found(`
${open}
  for (const c of CASES) expect(c).toBe(1);
${close}`),
      ).toEqual([{ test: 't', loop: 'for (const c of CASES)', line: 3 }]);
    });

  const ALLOWED: readonly (readonly [string, string])[] = [
    [
      'a loop that generates one test per case',
      'for (const c of CASES) it(`${c}`, () => expect(c).toBe(1));',
    ],
    [
      'a loop with no assertion or page change in it',
      `it('t', () => {
  const out = [];
  for (const c of CASES) out.push(c);
  expect(out).toEqual(CASES);
});`,
    ],
    [
      'a loop in a describe body',
      `describe('d', () => {
  for (const c of CASES) expect(c).toBe(1);
});`,
    ],
    [
      'a loop in test.describe',
      `test.describe('d', () => {
  for (const c of CASES) expect(c).toBe(1);
});`,
    ],
    [
      'a loop in a hook',
      `beforeEach(() => {
  for (const c of CASES) expect(c).toBe(1);
});`,
    ],
    [
      'a runtime population, declared above the loop',
      inTest(`// runtime population: the rows f() returned
  for (const r of f()) expect(r).toBe(1);`),
    ],
    [
      'one scenario, declared above the loop',
      inTest(`// one scenario: each answer moves the state the next one reads
  for (const a of ANSWERS) expect((s = answer(s, a))).toBeDefined();`),
    ],
    [
      'a runtime population, declared above the statement holding the loop',
      inTest(`// runtime population: the rows f() returned
  await Promise.all(f().map(async (r) => expect(r).toBe(1)));`),
    ],
  ];
  for (const [what, source] of ALLOWED)
    it(`leaves alone ${what}`, () => {
      expect(found(source)).toEqual([]);
    });

  const NOT_A_MARKER: readonly (readonly [string, string])[] = [
    ['a marker with no reason', '// runtime population:'],
    ['a marker with a blank reason', '// one scenario:   '],
    ['a marker in a block comment', '/* runtime population: the rows */'],
    ['another word', '// runtime: the rows'],
    ['the words in a string', "const note = '// runtime population: rows';"],
  ];
  for (const [what, above] of NOT_A_MARKER)
    it(`still reports a loop under ${what}`, () => {
      expect(
        found(`
it('t', () => {
  ${above}
  for (const r of f()) expect(r).toBe(1);
});`),
      ).toEqual([{ test: 't', loop: 'for (const r of f())', line: 4 }]);
    });

  it('still reports a loop whose marker sits above an earlier statement', () => {
    expect(
      found(`
it('t', () => {
  // runtime population: the rows f() returned
  const rows = f();
  for (const r of rows) expect(r).toBe(1);
});`),
    ).toEqual([{ test: 't', loop: 'for (const r of rows)', line: 5 }]);
  });

  it('still reports a loop in a one-line test whose marker sits above the test itself', () => {
    expect(
      found(`
// runtime population: the rows f() returned
it('t', () => f().forEach((r) => expect(r).toBe(1)));`),
    ).toEqual([{ test: 't', loop: 'f().forEach(…)', line: 3 }]);
  });

  it('reports both loops of a nested pair, outer first', () => {
    expect(
      found(`
it('t', () => {
  for (const a of AS) {
    for (const b of BS) {
      expect(a + b).toBe(1);
    }
  }
});`),
    ).toEqual([
      { test: 't', loop: 'for (const a of AS)', line: 3 },
      { test: 't', loop: 'for (const b of BS)', line: 4 },
    ]);
  });

  it('judges each loop by its own marker: a marked outer loop leaves its inner loop reported', () => {
    expect(
      found(`
it('t', () => {
  // runtime population: the groups f() returned
  for (const group of f()) {
    for (const b of BS) expect(group[b]).toBe(1);
  }
});`),
    ).toEqual([{ test: 't', loop: 'for (const b of BS)', line: 5 }]);
  });

  it('names a template title by its source, so a burn-down entry is stable', () => {
    expect(
      found(`
for (const name of NAMES)
  it(\`\${name} at its edges\`, () => {
    for (const x of EDGES) expect(x).toBe(1);
  });`),
    ).toEqual([
      { test: '${name} at its edges', loop: 'for (const x of EDGES)', line: 4 },
    ]);
  });
});

/**
 * Every looped site in the suite on the day #58 landed, to be split by #59 to
 * #62. `file :: test :: loop`. The guard fails on a site missing from this
 * list AND on an entry that no longer matches a site, so the list can only
 * shrink: a conversion removes its entries in the same pull request.
 */
const BURN_DOWN: readonly string[] = [
  "apps/sync-worker/test/health.test.ts :: refuses every method but GET, naming the one it allows :: for (const method of ['POST', 'PUT', 'DELETE', 'PATCH'])",
  "packages/lockdown/test/lockdown.test.ts :: leaves the production API host untouched, robots.txt included :: for (const path of ['/health', '/robots.txt'])",
  'tests/engines/det-math.spec.ts :: det-math gives the same bits as Node on 100,000 inputs per function :: for (const fn of FUNCTIONS)',
];

const TEST_FILE = /\.(test|spec)\.ts$/;

/** Every looped site in every tracked test file, scanned inside each test, never at collection. */
const scan = (): { files: string[]; sites: string[] } => {
  const files = trackedFiles().filter((path) => TEST_FILE.test(path));
  const sites = files.flatMap((file) =>
    loopedCases(readFileSync(file, 'utf8'), file).map(
      (site) => `${file} :: ${site.test} :: ${site.loop}`,
    ),
  );
  return { files, sites };
};

/** `from` minus `taken`, one occurrence per match, so two identical sites need two entries. */
const minus = (from: readonly string[], taken: readonly string[]): string[] => {
  const left = [...taken];
  return from.filter((item) => {
    const at = left.indexOf(item);
    if (at === -1) return true;
    left.splice(at, 1);
    return false;
  });
};

describe('the suite', () => {
  it('scans every tracked test file, this one included', () => {
    const { files } = scan();
    expect(files).toContain('tests/unit/one-test-per-case.test.ts');
    expect(files).toContain('tests/engines/det-math.spec.ts');
    expect(files.length).toBeGreaterThanOrEqual(27);
  });

  it('loops no known population inside a test beyond the burn-down list', () => {
    expect(minus(scan().sites, BURN_DOWN)).toEqual([]);
  });

  it('keeps no burn-down entry that has already been split', () => {
    expect(minus(BURN_DOWN, scan().sites)).toEqual([]);
  });
});
