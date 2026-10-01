import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

/**
 * The licence set promised by spec D17 is present and is the real text
 * (Refs #2).
 *
 * The repository is public. A missing or wrong licence file is a legal fact
 * about every copy already cloned, so these files are guarded like code. Each
 * check reads the file's own opening line, never a filename alone: an empty
 * file or a pasted MIT text would otherwise pass.
 */

const firstLine = (path: string) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '');

describe('the licence set (D17)', () => {
  it('the code is Apache-2.0, with the canonical text', () => {
    const text = readFileSync('LICENSE', 'utf8');
    expect(firstLine('LICENSE')).toBe('Apache License');
    expect(text).toContain('Version 2.0, January 2004');
    expect(text).toContain('END OF TERMS AND CONDITIONS');
  });

  it('package.json declares the same code licence', () => {
    expect(JSON.parse(readFileSync('package.json', 'utf8')).license).toBe(
      'Apache-2.0',
    );
  });

  it('both content licences ship as full legal code', () => {
    expect(firstLine('LICENSES/CC-BY-SA-4.0.txt')).toBe(
      'Attribution-ShareAlike 4.0 International',
    );
    expect(firstLine('LICENSES/CC-BY-NC-SA-4.0.txt')).toBe(
      'Attribution-NonCommercial-ShareAlike 4.0 International',
    );
  });

  it('the content rule names exactly the two allowed licences', () => {
    const rule = readFileSync('LICENSE-CONTENT.md', 'utf8');
    const ids = [...rule.matchAll(/`(CC-[A-Z-]+-4\.0)`/g)].map(
      (match) => match[1],
    );
    expect([...new Set(ids)].sort()).toEqual([
      'CC-BY-NC-SA-4.0',
      'CC-BY-SA-4.0',
    ]);
  });

  it('the notice and the trademark reservation are present', () => {
    expect(existsSync('NOTICE'), 'Apache-2.0 section 4(d)').toBe(true);
    expect(firstLine('NOTICE')).toBe('Wordfarer');
    expect(firstLine('TRADEMARKS.md')).toBe('# Trademarks');
  });
});
