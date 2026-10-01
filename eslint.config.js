import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteConfig from './apps/web/svelte.config.js';

/**
 * One flat config for the whole monorepo. `--max-warnings 0` in the lint
 * script makes every warning a failure (zero-warnings policy, spec §12).
 *
 * Type-aware rules (`strictTypeChecked`) use the TypeScript project service,
 * which finds the nearest tsconfig.json for each file, so every workspace is
 * linted against its own compiler options.
 *
 * Ignores come from `.gitignore` rather than a list kept here, so anything git
 * does not track (build output, wrangler state, local agent scratch) is never
 * linted.
 */
export default tseslint.config(
  includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url))),
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { parser: tseslint.parser, svelteConfig },
    },
    rules: {
      // A component without <script lang="ts"> is compiled as JavaScript and
      // imports as `any` under strict TypeScript (measured while planning M0).
      'svelte/block-lang': ['error', { script: 'ts' }],
    },
  },
  {
    files: ['apps/web/src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
