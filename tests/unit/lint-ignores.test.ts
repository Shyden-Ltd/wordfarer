import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/**
 * ESLint's ignores are derived from `.gitignore`, never listed by hand. A
 * hand-written list missed `.wrangler/` and a local agent's scratch files, so
 * an untracked TypeScript file on a contributor's machine failed `npm run lint`
 * while CI, which has no such file, stayed green.
 */
const ignoredDirectories = readFileSync('.gitignore', 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(
    (line) =>
      line.endsWith('/') && !line.startsWith('#') && !line.startsWith('!'),
  );

describe('lint ignores follow .gitignore', () => {
  it('reads the directories it checks from .gitignore', () => {
    expect(ignoredDirectories).toEqual(
      expect.arrayContaining([
        'node_modules/',
        '.wrangler/',
        '.superpowers/',
        '.remember/',
      ]),
    );
  });

  it.each(ignoredDirectories)(
    'ESLint skips TypeScript under %s',
    async (directory) => {
      const eslint = new ESLint();
      expect(await eslint.isPathIgnored(`${directory}probe.ts`)).toBe(true);
    },
  );
});
