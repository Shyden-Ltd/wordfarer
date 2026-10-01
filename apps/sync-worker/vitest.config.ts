import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

/**
 * Tests run INSIDE workerd against real local D1 (Miniflare), spec §12.4,
 * with the bindings read from wrangler.jsonc so a test can never pass against
 * a binding the deployed Worker does not have.
 */
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
