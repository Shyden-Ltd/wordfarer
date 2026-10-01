import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanWorkflow } from './workflow-secrets';

/**
 * Deploy secrets live only in environments (spec §12.9). The fixtures pin the
 * scanner's behaviour on each shape a secret reference can take; the last
 * block runs it over this repo's real workflows.
 */

const workflow = (jobs: string, top = '') =>
  `name: x\non:\n  push:\n${top}jobs:\n${jobs}`;

const job = (body: string) =>
  `  deploy:\n    runs-on: ubuntu-latest\n${body}    steps:\n      - run: wrangler deploy\n        env:\n          TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}\n`;

const problems = (source: string) =>
  scanWorkflow('w.yml', source).findings.map((f) => f.problem);

describe('scanWorkflow', () => {
  it('accepts a secret in a job that declares the dev environment', () => {
    const scan = scanWorkflow('w.yml', workflow(job('    environment: dev\n')));
    expect(scan.secretReferences).toBe(1);
    expect(scan.findings).toEqual([]);
  });

  it('accepts the long form, environment: { name: production, url }', () => {
    const scan = scanWorkflow(
      'w.yml',
      workflow(
        job(
          '    environment:\n      name: production\n      url: https://x.test\n',
        ),
      ),
    );
    expect(scan.secretReferences).toBe(1);
    expect(scan.findings).toEqual([]);
  });

  it('flags a secret in a job with no environment', () => {
    expect(problems(workflow(job('')))).toEqual([
      'secrets.CLOUDFLARE_API_TOKEN in a job that declares no environment; it must be one of dev, production',
    ]);
  });

  it('flags a secret in a job whose environment is not a protected one', () => {
    expect(problems(workflow(job('    environment: scratch\n')))).toEqual([
      'secrets.CLOUDFLARE_API_TOKEN in a job that declares environment "scratch"; it must be one of dev, production',
    ]);
  });

  it('flags an environment chosen by expression, since nothing can check it', () => {
    const findings = problems(
      workflow(job('    environment: ${{ inputs.target }}\n')),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain(
      'declares environment "${{ inputs.target }}"',
    );
  });

  it.each([
    [
      'bracket syntax',
      "${{ secrets['CLOUDFLARE_API_TOKEN'] }}",
      "secrets['CLOUDFLARE_API_TOKEN']",
    ],
    ['the whole context', '${{ toJSON(secrets) }}', 'secrets'],
  ])('sees %s', (_label, expression, reported) => {
    const source = workflow(
      `  leak:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "${expression}"\n`,
    );
    expect(problems(source)).toEqual([
      `${reported} in a job that declares no environment; it must be one of dev, production`,
    ]);
  });

  it('sees secrets: inherit on a reusable-workflow call', () => {
    const source = workflow(
      '  call:\n    uses: ./.github/workflows/deploy.yml\n    secrets: inherit\n',
    );
    expect(problems(source)).toEqual([
      'secrets in a job that declares no environment; it must be one of dev, production',
    ]);
  });

  it('flags a secret in workflow-level env, which no environment can guard', () => {
    const source = workflow(
      '  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n',
      'env:\n  TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n',
    );
    expect(problems(source)).toEqual([
      'secrets.CLOUDFLARE_API_TOKEN outside any job, so no environment can protect it',
    ]);
  });

  it('ignores GITHUB_TOKEN, which GitHub mints per run', () => {
    const source = workflow(
      '  status:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gh api x\n        env:\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n',
    );
    const scan = scanWorkflow('w.yml', source);
    expect(scan.secretReferences).toBe(0);
    expect(scan.findings).toEqual([]);
  });

  it('is not satisfied or tripped by a comment', () => {
    const source = workflow(
      '  test:\n    runs-on: ubuntu-latest\n    # environment: dev  -- reads ${{ secrets.CLOUDFLARE_API_TOKEN }}\n    steps:\n      - run: npm test\n',
    );
    const scan = scanWorkflow('w.yml', source);
    expect(scan.secretReferences).toBe(0);
    expect(scan.findings).toEqual([]);
  });

  it('refuses pull_request_target outright', () => {
    const source =
      'on:\n  pull_request_target:\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: "true"\n';
    expect(problems(source)).toEqual([
      'pull_request_target runs fork code with this repo’s secrets and a write token',
    ]);
  });
});

describe('this repo’s workflows keep every secret inside an environment', () => {
  // Read inside each test, not in the describe body: a throw at collection
  // time fails the file as "no tests" instead of naming the broken assertion.
  const dir = '.github/workflows';
  const scanAll = () =>
    readdirSync(dir)
      .filter((f) => /\.ya?ml$/.test(f))
      .map((file) => ({
        file,
        scan: scanWorkflow(file, readFileSync(join(dir, file), 'utf8')),
      }));

  it('scans every workflow, and every one has jobs', () => {
    const scans = scanAll();
    expect(scans.length, 'positive control: workflows found').toBeGreaterThan(
      0,
    );
    expect(
      scans.filter(({ scan }) => scan.jobs === 0).map(({ file }) => file),
    ).toEqual([]);
  });

  it('no secret is read outside a protected environment', () => {
    expect(scanAll().flatMap(({ scan }) => scan.findings)).toEqual([]);
  });
});
