import { describe, expect, it } from 'vitest';
import { rawRelativeImports, scanModule } from './core-import-graph';

/**
 * packages/core/src keeps an acyclic graph of value imports (#92).
 *
 * #32's first build put four cycles into core through every gate step. These
 * fixtures pin how the reader classifies each way a module can name another;
 * the last block runs it over the real tree.
 */

const VALUE_FORMS: [string, string][] = [
  ['a named import', "import { x } from './b';"],
  ['a default import', "import x from './b';"],
  ['a default and a named import', "import x, { y } from './b';"],
  ['a namespace import', "import * as b from './b';"],
  ['a deferred namespace import', "import defer * as b from './b';"],
  ['a side-effect import', "import './b';"],
  ['a multi-line named import', "import {\n  x,\n  y,\n} from './b';"],
  [
    'a named import with one type specifier',
    "import { type T, x } from './b';",
  ],
  ['an empty import, which still loads the module', "import {} from './b';"],
  ['a double-quoted specifier', 'import { x } from "./b";'],
  ['a named re-export', "export { x } from './b';"],
  ['a multi-line re-export', "export {\n  x,\n  y,\n} from './b';"],
  ['a star re-export', "export * from './b';"],
  ['a namespace re-export', "export * as b from './b';"],
  ['a re-export with one type specifier', "export { type T, x } from './b';"],
  ['an empty re-export, which still loads the module', "export {} from './b';"],
];

const TYPE_FORMS: [string, string][] = [
  ['import type with names', "import type { T } from './b';"],
  ['import type with a default', "import type T from './b';"],
  ['import type with a namespace', "import type * as b from './b';"],
  ['an import whose one specifier is a type', "import { type T } from './b';"],
  [
    'an import whose every specifier is a type',
    "import { type T, type U } from './b';",
  ],
  ['export type with names', "export type { T } from './b';"],
  [
    'a re-export whose every specifier is a type',
    "export { type T } from './b';",
  ],
  ['export type star', "export type * from './b';"],
];

describe('scanModule reads a value import from every form', () => {
  it.each(VALUE_FORMS)('%s', (_label, source) => {
    expect(scanModule('a.ts', source)).toEqual({
      imports: [{ specifier: './b', value: true }],
      refused: [],
    });
  });

  it('reads a parent-relative specifier as written', () => {
    expect(scanModule('x/a.ts', "import { x } from '../b';")).toEqual({
      imports: [{ specifier: '../b', value: true }],
      refused: [],
    });
  });

  it.each([
    ['the current directory', '.'],
    ['the parent directory', '..'],
  ])('reads %s as a relative specifier', (_label, specifier) => {
    expect(scanModule('x/a.ts', `import { x } from '${specifier}';`)).toEqual({
      imports: [{ specifier, value: true }],
      refused: [],
    });
  });

  it('reads every declaration in a module, in source order', () => {
    const source = [
      "import { a } from './a';",
      "import type { T } from './t';",
      "export { c } from './c';",
      "import './d';",
    ].join('\n');
    expect(scanModule('m.ts', source)).toEqual({
      imports: [
        { specifier: './a', value: true },
        { specifier: './t', value: false },
        { specifier: './c', value: true },
        { specifier: './d', value: true },
      ],
      refused: [],
    });
  });
});

describe('scanModule reads a type-only declaration as no edge', () => {
  it.each(TYPE_FORMS)('%s', (_label, source) => {
    expect(scanModule('a.ts', source)).toEqual({
      imports: [{ specifier: './b', value: false }],
      refused: [],
    });
  });
});

describe('scanModule leaves a package import out of the graph', () => {
  it.each([
    ['a bare package', "import Decimal from 'break_infinity.js';"],
    ['a scoped package', "import pow from '@stdlib/math-base-special-pow';"],
    ['a package re-export', "export { z } from 'zod';"],
  ])('%s', (_label, source) => {
    expect(scanModule('a.ts', source)).toEqual({ imports: [], refused: [] });
  });
});

describe('scanModule refuses what it cannot place in the graph, by name', () => {
  it.each([
    [
      'a dynamic import()',
      "export const m = import('./b');",
      'a.ts:1: dynamic import() names a module only when it runs, so the graph cannot hold it; import it statically',
    ],
    [
      'a dynamic import() of a package, whose name could be computed',
      "export const m = import('zod');",
      'a.ts:1: dynamic import() names a module only when it runs, so the graph cannot hold it; import it statically',
    ],
    [
      'a require() call',
      "export const m = require('./b');",
      'a.ts:1: require() is CommonJS, which the graph does not read; import it statically',
    ],
    [
      'an import-equals require',
      "import b = require('./b');",
      'a.ts:1: import = require() is CommonJS, which the graph does not read; import it statically',
    ],
    [
      'core importing its own package by name',
      "import { x } from '@wordfarer/core';",
      "a.ts:1: '@wordfarer/core' names core's own package, which loads index.ts behind the graph's back; import the module relatively",
    ],
    [
      'core importing a subpath of its own package',
      "import { x } from '@wordfarer/core/sim';",
      "a.ts:1: '@wordfarer/core/sim' names core's own package, which loads index.ts behind the graph's back; import the module relatively",
    ],
  ])('%s', (_label, source, refusal) => {
    expect(scanModule('a.ts', source).refused).toEqual([refusal]);
  });

  it('names the line of a refusal deep inside a function', () => {
    const source = "export function f() {\n  return () => import('./b');\n}";
    expect(scanModule('a.ts', source).refused).toEqual([
      'a.ts:2: dynamic import() names a module only when it runs, so the graph cannot hold it; import it statically',
    ]);
  });

  it('refuses every unplaceable form in a module, not only the first', () => {
    const source =
      "export const a = import('./a');\nexport const b = require('./b');";
    expect(scanModule('a.ts', source).refused).toHaveLength(2);
  });

  it('is not misled by a comment or a string naming import()', () => {
    const source =
      "// import('./b') would be refused\nexport const s = \"require('./b')\";";
    expect(scanModule('a.ts', source)).toEqual({ imports: [], refused: [] });
  });
});

describe('rawRelativeImports counts relative specifiers in the raw text', () => {
  it.each([
    ['a single-line import', "import { x } from './b';", 1],
    ['a multi-line import', "import {\n  x,\n} from './b';", 1],
    ['a re-export', "export * from './b';", 1],
    ['a side-effect import', "import './b';", 1],
    ['a double-quoted specifier', 'import { x } from "./b";', 1],
    ['a parent-relative specifier', "import { x } from '../b';", 1],
    ['a bare current directory', "import { x } from '.';", 1],
    ['a bare parent directory', "import { x } from '..';", 1],
    ['a name that only starts with a dot', "import x from '.x';", 0],
    [
      'a type-only import, which is still a declaration',
      "import type { T } from './b';",
      1,
    ],
    ['a package import', "import Decimal from 'break_infinity.js';", 0],
    [
      'three declarations',
      "import { a } from './a';\nimport type { T } from './t';\nexport { c } from './c';",
      3,
    ],
  ])('%s', (_label, source, count) => {
    expect(rawRelativeImports(source)).toBe(count);
  });
});
