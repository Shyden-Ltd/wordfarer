/**
 * The Wordfarer sync Worker. In M0 it serves one route, `GET /health`, which
 * the dev deploy's verify job reads to prove two things about the live Worker:
 * it is the commit that was just deployed, and its D1 binding answers a query.
 */

const json = (
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store', ...headers },
  });

async function health(env: Env): Promise<Response> {
  try {
    await env.DB.prepare('SELECT 1').run();
  } catch (error) {
    // The response says only `unreachable`; the cause goes to the Worker logs.
    console.error('health: D1 query failed', error);
    return json({ ok: false, commit: env.COMMIT, db: 'unreachable' }, 503);
  }
  return json({ ok: true, commit: env.COMMIT, db: 'ok' }, 200);
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname !== '/health') {
      return json({ error: 'not_found' }, 404);
    }
    if (request.method !== 'GET') {
      return json({ error: 'method_not_allowed' }, 405, { allow: 'GET' });
    }
    return health(env);
  },
} satisfies ExportedHandler<Env>;
