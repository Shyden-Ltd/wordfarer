import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The Worker tests run on the same runtime that deploys.
 *
 * @cloudflare/vitest-pool-workers pins its own wrangler and miniflare, and
 * 0.22.0 pinned versions carrying five high advisories (sharp, undici). The
 * root `overrides` points it at the root wrangler and a patched miniflare.
 * When Dependabot bumps wrangler, the miniflare override goes stale and the
 * lock grows a second copy: the tests would then run on one workerd while
 * `wrangler deploy` ships for another. This fails that bump until the
 * override is updated to the miniflare the new wrangler depends on.
 */

interface PackageLock {
  packages: Record<string, { version?: string }>;
}

const versionsOf = (name: string) => {
  const lock = JSON.parse(
    readFileSync('package-lock.json', 'utf8'),
  ) as PackageLock;
  const suffix = `node_modules/${name}`;
  return [
    ...new Set(
      Object.entries(lock.packages)
        .filter(([path]) => path === suffix || path.endsWith(`/${suffix}`))
        .map(([, entry]) => entry.version ?? '(none)'),
    ),
  ];
};

describe('one Workers runtime in the lock', () => {
  it.each(['wrangler', 'miniflare', 'workerd'])(
    'exactly one version of %s',
    (name) => {
      expect(versionsOf(name)).toHaveLength(1);
    },
  );
});
