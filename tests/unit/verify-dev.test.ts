import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  gateProblems,
  healthProblems,
  verifyDev,
  webProblems,
  type Probe,
} from '../../scripts/verify-dev';

const SHA = 'd547bd669678987eb85b5807d1a26ea55eaeb987';
const OLD = '1f660b30f75d081ae6559d175e5c0c3e26acb84c';
const page = (sha: string) =>
  `<html><head><meta name="wordfarer-commit" content="${sha}" /></head></html>`;
const probe = (
  status: number,
  body = '',
  location: string | null = null,
): Probe => ({
  status,
  body,
  location,
});

describe('gateProblems', () => {
  it.each([401, 403])('accepts a %i refusal', (status) => {
    expect(gateProblems('web', probe(status))).toEqual([]);
  });

  it('accepts a redirect to the Access login', () => {
    expect(
      gateProblems(
        'web',
        probe(
          302,
          '',
          'https://shyden.cloudflareaccess.com/cdn-cgi/access/login/x',
        ),
      ),
    ).toEqual([]);
  });

  it('refuses a redirect anywhere else, including a look-alike host', () => {
    expect(
      gateProblems(
        'web',
        probe(302, '', 'https://cloudflareaccess.com.evil.test/'),
      ),
    ).toEqual([
      'web: redirects to https://cloudflareaccess.com.evil.test/, not to Cloudflare Access',
    ]);
  });

  it('fails when the site answers 200 to an anonymous request', () => {
    expect(gateProblems('sync', probe(200))).toEqual([
      'sync: answered 200 without a service token; the Access gate is not in front of it',
    ]);
  });
});

describe('webProblems', () => {
  it('accepts the expected commit', () => {
    expect(webProblems(probe(200, page(SHA)), SHA)).toEqual([]);
  });

  it('names the stale commit when the previous deploy is still served', () => {
    expect(webProblems(probe(200, page(OLD)), SHA)).toEqual([
      `web: serves commit ${OLD}, expected ${SHA}`,
    ]);
  });

  it('fails a page with no stamp, and a non-200', () => {
    expect(webProblems(probe(200, '<html></html>'), SHA)).toEqual([
      'web: no wordfarer-commit meta tag in the page',
    ]);
    expect(webProblems(probe(500, page(SHA)), SHA)).toEqual([
      'web: status 500, expected 200',
    ]);
  });
});

describe('healthProblems', () => {
  const healthy = JSON.stringify({ ok: true, commit: SHA, db: 'ok' });

  it('accepts ok, the commit and db ok', () => {
    expect(healthProblems(probe(200, healthy), SHA)).toEqual([]);
  });

  it.each([
    ['a stale commit', { ok: true, commit: OLD, db: 'ok' }],
    ['a D1 failure', { ok: false, commit: SHA, db: 'unreachable' }],
    ['an extra field', { ok: true, commit: SHA, db: 'ok', debug: 1 }],
  ])('fails %s', (_label, body) => {
    expect(healthProblems(probe(200, JSON.stringify(body)), SHA)).toHaveLength(
      1,
    );
  });

  it('fails a non-JSON body and a non-200', () => {
    expect(healthProblems(probe(200, 'oops'), SHA)).toEqual([
      'sync: /health did not return JSON',
    ]);
    expect(healthProblems(probe(503, healthy), SHA)).toEqual([
      'sync: /health status 503, expected 200',
    ]);
  });
});

/**
 * verifyDev end to end over real HTTP: a local server stands in for Access,
 * answering a 302 to the login host without the service-token headers and
 * the site with them. `served` is the commit it currently serves.
 */
describe('verifyDev', () => {
  let server: Server;
  let base = '';
  let served = SHA;
  let gated = true;
  let requests = 0;

  beforeAll(async () => {
    server = createServer((req, res) => {
      requests += 1;
      const authorised =
        req.headers['cf-access-client-id'] === 'id' &&
        req.headers['cf-access-client-secret'] === 'secret';
      if (gated && !authorised) {
        res.writeHead(302, {
          location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login',
        });
        res.end();
        return;
      }
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, commit: served, db: 'ok' }));
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(page(served));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  });

  afterAll(() => {
    server.close();
  });

  const target = () => ({
    webUrl: `${base}/`,
    syncUrl: base,
    sha: SHA,
    clientId: 'id',
    clientSecret: 'secret',
  });

  it('passes a gated site serving the expected commit', async () => {
    served = SHA;
    gated = true;
    requests = 0;
    expect(await verifyDev(target(), { attempts: 1, delayMs: 0 })).toEqual([]);
    expect(
      requests,
      'two anonymous probes, then web and health with the token',
    ).toBe(4);
  });

  it('fails, without retrying, when the gate is gone', async () => {
    served = SHA;
    gated = false;
    requests = 0;
    expect(await verifyDev(target(), { attempts: 3, delayMs: 0 })).toEqual([
      'web: answered 200 without a service token; the Access gate is not in front of it',
      'sync: answered 200 without a service token; the Access gate is not in front of it',
    ]);
    expect(requests).toBe(2);
    gated = true;
  });

  it('retries a stale deploy, then reports both stale hosts', async () => {
    served = OLD;
    requests = 0;
    const problems = await verifyDev(target(), { attempts: 3, delayMs: 0 });
    expect(problems).toEqual([
      `web: serves commit ${OLD}, expected ${SHA}`,
      `sync: /health returned ${JSON.stringify({ ok: true, commit: OLD, db: 'ok' })}, expected ${JSON.stringify({ ok: true, commit: SHA, db: 'ok' })}`,
    ]);
    expect(requests, 'two gate probes plus three attempts of two').toBe(8);
    served = SHA;
  });
});
