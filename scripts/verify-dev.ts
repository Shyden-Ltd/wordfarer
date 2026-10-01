/**
 * Verifies a dev deploy from the outside, the way a tester's browser sees it.
 *
 * `wrangler deploy` exiting 0 says an upload happened. It does not say the
 * live URL serves THIS commit, that D1 answers, or that the Access gate still
 * keeps the public out. Each of those is checked here, and the run fails on
 * the first that does not hold:
 *
 * 1. Without a service token, both hostnames refuse (Access redirect or 401/403).
 *    A gate that has quietly gone away fails this, not just a broken site.
 * 2. With the token, the web page carries `wordfarer-commit` = the expected SHA.
 * 3. With the token, the Worker's /health reports ok, that SHA, and db "ok".
 *
 * Checks 2 and 3 retry, because the previous deploy can be served for a few
 * seconds after the upload finishes. Check 1 does not need to.
 */

export interface Probe {
  status: number;
  location: string | null;
  body: string;
}

export interface Target {
  webUrl: string;
  syncUrl: string;
  sha: string;
  clientId: string;
  clientSecret: string;
}

const ACCESS_LOGIN_HOST = /\.cloudflareaccess\.com$/;

export function gateProblems(label: string, probe: Probe): string[] {
  if (probe.status === 401 || probe.status === 403) return [];
  if (probe.status === 302 || probe.status === 303) {
    // A relative Location stays on the same host, so it is never Access.
    const host =
      probe.location !== null && URL.canParse(probe.location)
        ? new URL(probe.location).hostname
        : '';
    return ACCESS_LOGIN_HOST.test(host)
      ? []
      : [
          `${label}: redirects to ${probe.location ?? 'nowhere'}, not to Cloudflare Access`,
        ];
  }
  return [
    `${label}: answered ${String(probe.status)} without a service token; the Access gate is not in front of it`,
  ];
}

export function webProblems(probe: Probe, sha: string): string[] {
  if (probe.status !== 200)
    return [`web: status ${String(probe.status)}, expected 200`];
  const stamp = /<meta name="wordfarer-commit" content="([^"]*)"/.exec(
    probe.body,
  )?.[1];
  if (stamp === undefined)
    return ['web: no wordfarer-commit meta tag in the page'];
  return stamp === sha ? [] : [`web: serves commit ${stamp}, expected ${sha}`];
}

export function healthProblems(probe: Probe, sha: string): string[] {
  if (probe.status !== 200)
    return [`sync: /health status ${String(probe.status)}, expected 200`];
  let body: unknown;
  try {
    body = JSON.parse(probe.body);
  } catch {
    return ['sync: /health did not return JSON'];
  }
  const expected = { ok: true, commit: sha, db: 'ok' };
  return JSON.stringify(body) === JSON.stringify(expected)
    ? []
    : [
        `sync: /health returned ${JSON.stringify(body)}, expected ${JSON.stringify(expected)}`,
      ];
}

async function probe(
  url: string,
  headers: Record<string, string> = {},
): Promise<Probe> {
  const response = await fetch(url, { headers, redirect: 'manual' });
  return {
    status: response.status,
    location: response.headers.get('location'),
    body: await response.text(),
  };
}

/**
 * Probes `url` and judges the answer. A request that fails outright (a dropped
 * connection, DNS not yet resolving a new hostname) is a problem like any other,
 * so the retry loop retries it and the report names it instead of crashing.
 */
async function check(
  label: string,
  url: string,
  headers: Record<string, string>,
  judge: (probe: Probe) => string[],
): Promise<string[]> {
  let answer: Probe;
  try {
    answer = await probe(url, headers);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [`${label}: request to ${url} failed: ${reason}`];
  }
  return judge(answer);
}

export async function verifyDev(
  target: Target,
  { attempts, delayMs }: { attempts: number; delayMs: number },
): Promise<string[]> {
  const healthUrl = new URL('/health', target.syncUrl).href;
  const gate = [
    ...(await check('web', target.webUrl, {}, (p) => gateProblems('web', p))),
    ...(await check('sync', healthUrl, {}, (p) => gateProblems('sync', p))),
  ];
  if (gate.length > 0) return gate;

  const token = {
    'CF-Access-Client-Id': target.clientId,
    'CF-Access-Client-Secret': target.clientSecret,
  };
  let problems: string[] = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    problems = [
      ...(await check('web', target.webUrl, token, (p) =>
        webProblems(p, target.sha),
      )),
      ...(await check('sync', healthUrl, token, (p) =>
        healthProblems(p, target.sha),
      )),
    ];
    if (problems.length === 0) return [];
    if (attempt < attempts)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return problems;
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '')
    throw new Error(`${name} is not set`);
  return value;
}

if (import.meta.main) {
  const problems = await verifyDev(
    {
      webUrl: required('DEV_WEB_URL'),
      syncUrl: required('DEV_SYNC_URL'),
      sha: required('EXPECTED_SHA'),
      clientId: required('CF_ACCESS_CLIENT_ID'),
      clientSecret: required('CF_ACCESS_CLIENT_SECRET'),
    },
    { attempts: 12, delayMs: 10_000 },
  );
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    process.exit(1);
  }
  console.log('✓ dev is gated, serves the expected commit, and D1 answers');
}
