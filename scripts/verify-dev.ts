/**
 * Verifies a dev deploy from the outside, the way a tester's browser sees it.
 *
 * `wrangler deploy` exiting 0 says an upload happened. It does not say the
 * live URL serves THIS commit, that D1 answers, or that the password gate
 * (#39) still keeps the public out. Each of those is checked here:
 *
 * 1. The web host answers 401 with a Basic challenge and none of the app,
 *    both without credentials and with a wrong password.
 * 2. Its robots.txt blocks every crawler, without credentials.
 * 3. With the password, the page carries `wordfarer-commit` = the expected SHA
 *    and the noindex header.
 * 4. The sync API's /health reports ok, that SHA and db "ok", with the
 *    noindex header (the API is not password-gated, by operator decision).
 *
 * Every check retries, because the previous deploy can be served for a few
 * seconds after an upload and a new Custom Domain's DNS and certificate can
 * take a minute on the first deploy. One thing never retries: a web response
 * that serves content WITHOUT the password. That is a leak, not a delay.
 *
 * The password is sent, never printed: no problem message carries a header.
 */

export interface Probe {
  status: number;
  headers: Headers;
  body: string;
}

export interface Target {
  webUrl: string;
  syncUrl: string;
  sha: string;
  password: string;
}

export const NO_INDEX = 'noindex, nofollow, noarchive';

const COMMIT_STAMP = /<meta name="wordfarer-commit" content="([^"]*)"/;

/** Any sign that a response carries the app rather than a challenge. */
const APP_MARKUP = /<(?:!doctype|html|meta|script)\b/i;

export function basicAuthorization(password: string): string {
  const bytes = new TextEncoder().encode(`verify-dev:${password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}

/** Problems with a response that should be the password challenge. */
export function gateProblems(label: string, probe: Probe): string[] {
  const problems: string[] = [];
  if (probe.status !== 401) {
    problems.push(
      `${label}: answered ${String(probe.status)}, expected 401; the password gate is not in front of it`,
    );
  }
  if (!/^Basic /i.test(probe.headers.get('www-authenticate') ?? '')) {
    problems.push(`${label}: no Basic WWW-Authenticate challenge`);
  }
  if (APP_MARKUP.test(probe.body)) {
    problems.push(`${label}: the response carries app markup`);
  }
  return problems;
}

/** A gate probe that came back 2xx served content without the password. */
export function leaked(probe: Probe): boolean {
  return probe.status >= 200 && probe.status < 300;
}

export function robotsProblems(probe: Probe): string[] {
  if (probe.status !== 200)
    return [
      `robots.txt: status ${String(probe.status)} without credentials, expected 200`,
    ];
  return /^User-agent: \*\nDisallow: \/$/m.test(probe.body)
    ? []
    : ['robots.txt: does not block every crawler'];
}

function noIndexProblems(label: string, probe: Probe): string[] {
  const tag = probe.headers.get('x-robots-tag');
  return tag === NO_INDEX
    ? []
    : [
        `${label}: X-Robots-Tag is ${JSON.stringify(tag)}, expected "${NO_INDEX}"`,
      ];
}

export function webProblems(probe: Probe, sha: string): string[] {
  if (probe.status !== 200)
    return [
      `web: status ${String(probe.status)} with the password, expected 200`,
    ];
  const stamp = COMMIT_STAMP.exec(probe.body)?.[1];
  return [
    ...(stamp === undefined
      ? ['web: no wordfarer-commit meta tag in the page']
      : stamp === sha
        ? []
        : [`web: serves commit ${stamp}, expected ${sha}`]),
    ...noIndexProblems('web', probe),
  ];
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
  return [
    ...(JSON.stringify(body) === JSON.stringify(expected)
      ? []
      : [
          `sync: /health returned ${JSON.stringify(body)}, expected ${JSON.stringify(expected)}`,
        ]),
    ...noIndexProblems('sync', probe),
  ];
}

async function probe(
  url: string,
  headers: Record<string, string> = {},
): Promise<Probe> {
  const response = await fetch(url, { headers, redirect: 'manual' });
  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  };
}

interface Outcome {
  problems: string[];
  /** The probe, or null when the request failed outright. */
  answer: Probe | null;
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
): Promise<Outcome> {
  let answer: Probe;
  try {
    answer = await probe(url, headers);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      problems: [`${label}: request to ${url} failed: ${reason}`],
      answer: null,
    };
  }
  return { problems: judge(answer), answer };
}

export async function verifyDev(
  target: Target,
  { attempts, delayMs }: { attempts: number; delayMs: number },
): Promise<string[]> {
  const healthUrl = new URL('/health', target.syncUrl).href;
  const robotsUrl = new URL('/robots.txt', target.webUrl).href;
  const right = { Authorization: basicAuthorization(target.password) };
  // Appending to the real password guarantees a different one.
  const wrong = { Authorization: basicAuthorization(`${target.password}x`) };

  let problems: string[] = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const gate = [
      await check('web without credentials', target.webUrl, {}, (p) =>
        gateProblems('web without credentials', p),
      ),
      await check('web with a wrong password', target.webUrl, wrong, (p) =>
        gateProblems('web with a wrong password', p),
      ),
    ];
    const gateProblemsFound = gate.flatMap((outcome) => outcome.problems);
    if (gate.some(({ answer }) => answer !== null && leaked(answer))) {
      return gateProblemsFound;
    }
    const rest = [
      await check('robots.txt', robotsUrl, {}, robotsProblems),
      await check('web', target.webUrl, right, (p) =>
        webProblems(p, target.sha),
      ),
      await check('sync', healthUrl, {}, (p) => healthProblems(p, target.sha)),
    ];
    problems = [
      ...gateProblemsFound,
      ...rest.flatMap((outcome) => outcome.problems),
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
      password: required('DEV_BASIC_AUTH_PASSWORD'),
    },
    { attempts: 18, delayMs: 10_000 },
  );
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    process.exit(1);
  }
  console.log(
    '✓ dev is password-gated, blocks crawlers, serves the expected commit, and D1 answers',
  );
}
