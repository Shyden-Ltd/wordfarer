import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import config from '../../playwright.engines.config';

/**
 * The cross-engine check stays wired (#26 AC10). A Playwright project dropped
 * from the config, or a CI step removed, would let the check pass by not
 * running; this suite fails instead. The workflow is read as parsed YAML, so
 * a comment naming a command cannot stand in for the step.
 */

interface Step {
  name?: string;
  run?: string;
}

const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8')) as {
  jobs: Record<string, { steps: Step[] }>;
};

describe('the cross-engine harness', () => {
  it('runs on Chromium, Firefox and WebKit', () => {
    const engines = (config.projects ?? []).map(
      (p) => p.use?.defaultBrowserType,
    );
    expect([...engines].sort()).toEqual(['chromium', 'firefox', 'webkit']);
  });

  it('runs in CI, after installing all three browsers', () => {
    const steps = ci.jobs['build-and-test']?.steps ?? [];
    const install = steps.findIndex((s) =>
      /playwright install --with-deps chromium firefox webkit/.test(
        s.run ?? '',
      ),
    );
    const run = steps.findIndex(
      (s) => (s.run ?? '').trim() === 'npm run test:engines',
    );
    expect(install, 'browser install step').toBeGreaterThanOrEqual(0);
    expect(run, 'test:engines step').toBeGreaterThan(install);
  });

  it('is what npm run test:engines runs', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['test:engines']).toBe(
      'playwright test -c playwright.engines.config.ts',
    );
  });
});
