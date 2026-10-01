import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  bundledPackages,
  pickFile,
  renderNotices,
  SHIPPED_WORKSPACES,
  type Lockfile,
} from '../../scripts/third-party-notices';

/**
 * Third-party notices for everything a shipped build bundles (#26 AC11).
 *
 * Apache-2.0 §4 requires a copy of the licence and every NOTICE text of the
 * works we redistribute, and MIT requires its copyright line. The six direct
 * @stdlib packages pull in 152, several of whose LICENSE files append
 * upstream copyrights (Sun, the Go Authors) to the Apache text, so the listing is
 * derived from the lockfile and the installed files, never kept by hand.
 */

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as Lockfile;
const listing = readFileSync('THIRD-PARTY-NOTICES.md', 'utf8');

function directDependencies(workspace: string): string[] {
  const pkg = JSON.parse(readFileSync(`${workspace}/package.json`, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  return Object.keys(pkg.dependencies ?? {});
}

describe('THIRD-PARTY-NOTICES.md', () => {
  it('is exactly what the generator renders from the lockfile (npm run notices)', () => {
    expect(listing).toBe(renderNotices(lock, '.'));
  });

  it('covers the whole dependency closure of every shipped workspace', () => {
    const names = bundledPackages(lock).map((p) => p.name);
    // The closure is larger than the direct list: @stdlib's six pull in 152.
    expect(
      names.filter((n) => n.startsWith('@stdlib/')).length,
    ).toBeGreaterThan(100);
    for (const workspace of SHIPPED_WORKSPACES) {
      for (const name of directDependencies(workspace)) {
        expect(names, `${workspace} depends on ${name}`).toContain(name);
      }
    }
    for (const name of names) {
      expect(listing, name).toContain(`\`${name}\``);
    }
  });

  it('carries every distinct licence text, including the upstream Sun and Go copyrights', () => {
    expect(listing).toContain('Apache License');
    expect(listing).toContain(
      'Copyright (C) 1993-2004 by Sun Microsystems, Inc.',
    );
    expect(listing).toContain('Copyright (c) 2009 The Go Authors.');
    expect(listing).toContain('Copyright (c) 2016-2026 The Stdlib Authors.');
  });
});

describe('pickFile, the same on every filesystem', () => {
  // Pure over a list of names, so Linux's case-sensitive behaviour is tested
  // on any OS. `ms` 2.0.0 ships `license.md`; CI (Linux) failed on it while
  // macOS's case-insensitive lookup found it.
  it.each<[string[], string | undefined]>([
    [['license.md', 'index.js'], 'license.md'],
    [['LICENSE', 'license.md'], 'LICENSE'],
    [['LICENCE.txt'], 'LICENCE.txt'],
    [['license.txt', 'LICENSE.md'], 'LICENSE.md'],
    [['LICENSE.md', 'license.txt'], 'LICENSE.md'],
    // One rank: the name decides, never the listing order.
    [['license', 'LICENSE'], 'LICENSE'],
    [['LICENSE', 'LICENCE'], 'LICENCE'],
    [['README.md', 'package.json'], undefined],
    [['LICENSE-MIT'], undefined],
  ])('picks the licence file from %j', (names, want) => {
    expect(pickFile(names, 'licence')).toBe(want);
  });

  it.each<[string[], string | undefined]>([
    [['NOTICE', 'LICENSE'], 'NOTICE'],
    [['notice.md'], 'notice.md'],
    [['LICENSE'], undefined],
  ])('picks the notice file from %j', (names, want) => {
    expect(pickFile(names, 'notice')).toBe(want);
  });
});

describe('NOTICE', () => {
  const notice = readFileSync('NOTICE', 'utf8');

  it('names each bundled Apache-2.0 @stdlib package and points to the full texts', () => {
    const stdlib = directDependencies('packages/core').filter((n) =>
      n.startsWith('@stdlib/'),
    );
    expect(stdlib.length).toBeGreaterThan(0);
    for (const name of stdlib) {
      expect(notice, name).toContain(name);
    }
    expect(notice).toContain('THIRD-PARTY-NOTICES.md');
  });
});
