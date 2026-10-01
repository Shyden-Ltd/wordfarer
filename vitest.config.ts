import { defineConfig } from 'vitest/config';

/**
 * The root suite: repo guards (tests/) and every workspace that runs in plain
 * Node.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'apps/web/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
