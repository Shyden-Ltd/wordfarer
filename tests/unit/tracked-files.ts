import { execFileSync } from 'node:child_process';

/**
 * Every path git tracks, relative to the repo root. Read NUL-separated, since
 * without `-z` git quotes any path holding a non-ASCII byte and the quoted
 * spelling matches no file.
 */
export const trackedFiles = (): string[] =>
  execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((path) => path !== '');
