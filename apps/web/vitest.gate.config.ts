import { defineConfig } from 'vitest/config';

/**
 * The dev web Worker's gate tests (#39). They run in Node and drive wrangler's
 * test harness, which serves the Worker from the real wrangler.jsonc through
 * Cloudflare's asset router, the layer `run_worker_first` configures. The
 * assets are ./dist, so `npm run test` builds the app first.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    hookTimeout: 60_000,
  },
});
