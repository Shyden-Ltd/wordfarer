import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { unstable_readConfig } from 'wrangler';

/**
 * The dev Workers' deploy configs, read the way `wrangler deploy` reads them
 * (comments stripped, defaults applied), so no comment can satisfy or trip a
 * guard (#39 AC2, AC7).
 */
const ROOT = new URL('../..', import.meta.url).pathname;

/**
 * The fields these guards read, declared here rather than imported: wrangler's
 * own `Config` type comes from `@cloudflare/workers-utils`, which it bundles
 * without shipping its declarations, so it does not resolve.
 */
interface DeployConfig {
  name: string;
  main: string | undefined;
  workers_dev: unknown;
  routes: unknown;
  assets: Record<string, unknown> | undefined;
  vars: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function readDeployConfig(path: string): DeployConfig {
  const raw: unknown = unstable_readConfig({ config: path });
  if (!isRecord(raw)) throw new Error(`${path}: not a config object`);
  const { name, main, workers_dev, routes, assets, vars } = raw;
  if (typeof name !== 'string') throw new Error(`${path}: no name`);
  if (main !== undefined && typeof main !== 'string')
    throw new Error(`${path}: main is not a path`);
  if (assets !== undefined && !isRecord(assets))
    throw new Error(`${path}: assets is not an object`);
  if (!isRecord(vars)) throw new Error(`${path}: vars is not an object`);
  return { name, main, workers_dev, routes, assets, vars };
}

/** Every wrangler config in the repo, found on disk rather than listed. */
function wranglerConfigs(dir = ROOT): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return wranglerConfigs(path);
    return /^wrangler\.(jsonc?|toml)$/.test(entry.name) ? [path] : [];
  });
}

const configs = wranglerConfigs().map((path) => ({
  file: relative(ROOT, path),
  config: readDeployConfig(path),
}));

function byName(name: string): DeployConfig {
  const found = configs.find(({ config }) => config.name === name);
  if (found === undefined) throw new Error(`no wrangler config named ${name}`);
  return found.config;
}

describe('the dev Workers’ deploy configs', () => {
  it('finds both dev Workers on disk (liveness)', () => {
    expect(configs.map(({ file }) => file).sort()).toEqual([
      'apps/sync-worker/wrangler.jsonc',
      'apps/web/wrangler.jsonc',
    ]);
  });

  it('serves the web Worker at its dev Custom Domain, gate first', () => {
    const web = byName('wordfarer-web-dev');
    expect(web.routes).toEqual([
      { pattern: 'dev.wordfarer.shyden.co.uk', custom_domain: true },
    ]);
    expect(web.main).toMatch(/apps\/web\/worker\/index\.ts$/);
    expect(web.assets).toMatchObject({
      binding: 'ASSETS',
      run_worker_first: true,
    });
  });

  it('serves the sync Worker at its dev Custom Domain', () => {
    expect(byName('wordfarer-sync-dev').routes).toEqual([
      { pattern: 'dev-api.wordfarer.shyden.co.uk', custom_domain: true },
    ]);
  });

  it('serves each dev Worker at its Custom Domain only, never on workers.dev', () => {
    expect(
      configs.map(({ config }) => [config.name, config.workers_dev]).sort(),
    ).toEqual([
      ['wordfarer-sync-dev', false],
      ['wordfarer-web-dev', false],
    ]);
  });

  it('declares no secret as a plain var (the password is a Worker secret)', () => {
    const declared = configs.flatMap(({ file, config }) =>
      Object.keys(config.vars).map((name) => ({ file, name })),
    );
    expect(declared).toContainEqual({
      file: 'apps/sync-worker/wrangler.jsonc',
      name: 'COMMIT',
    });
    expect(
      declared.filter(({ name }) => /PASSWORD|SECRET|TOKEN|KEY/i.test(name)),
    ).toEqual([]);
  });
});
