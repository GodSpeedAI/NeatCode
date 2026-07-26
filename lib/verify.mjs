// Verification capture. The point is not to run checks for the agent — it is to
// make "I ran it / I did not run it" a recorded fact rather than a claim.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SUMMARY_LINES = 20;

function condense(text) {
  const lines = (text ?? '').split('\n').filter((l) => l.trim() !== '');
  if (lines.length <= SUMMARY_LINES) return lines.join('\n');
  const head = lines.slice(0, SUMMARY_LINES - 6);
  const tail = lines.slice(-5);
  return [...head, `… ${lines.length - head.length - tail.length} lines elided …`, ...tail].join('\n');
}

/**
 * Run one verification command and record what actually happened.
 * The command string comes from the operator, so it runs through the shell by
 * design; nothing here interpolates repository content into it.
 */
export function runCheck(command, { cwd = process.cwd(), timeout = 15 * 60_000 } = {}) {
  const started = Date.now();
  const run = spawnSync(command, {
    cwd,
    shell: true,
    encoding: 'utf8',
    timeout,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (run.error && run.error.code === 'ETIMEDOUT') {
    return { command, ran: true, status: 'timeout', exitCode: null, durationMs: Date.now() - started, summary: `timed out after ${timeout}ms` };
  }
  if (run.error) {
    return { command, ran: false, status: 'not-run', exitCode: null, durationMs: Date.now() - started, summary: run.error.message };
  }
  return {
    command,
    ran: true,
    status: run.status === 0 ? 'passed' : 'failed',
    exitCode: run.status,
    durationMs: Date.now() - started,
    summary: condense(`${run.stdout ?? ''}\n${run.stderr ?? ''}`),
  };
}

export function runChecks(commands, options = {}) {
  return commands.map((command) => runCheck(command, options));
}

/**
 * Verification commands the repository declares about itself. Discovery only —
 * nothing is executed. Used to answer "what does this repo consider proof?"
 */
export function discoverChecks(root) {
  const found = [];
  const add = (source, command) => found.push({ source, command });

  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      for (const name of ['test', 'lint', 'typecheck', 'types', 'check', 'build', 'format']) {
        if (pkg.scripts?.[name]) add('package.json', `npm run ${name}`);
      }
    } catch {
      // Unparseable manifest is itself worth noticing, but not this module's job.
    }
  }
  if (existsSync(join(root, 'Cargo.toml'))) {
    add('Cargo.toml', 'cargo test');
    add('Cargo.toml', 'cargo clippy --all-targets --all-features');
  }
  if (existsSync(join(root, 'go.mod'))) {
    add('go.mod', 'go test ./...');
    add('go.mod', 'go vet ./...');
  }
  if (existsSync(join(root, 'pyproject.toml'))) {
    add('pyproject.toml', 'pytest');
  }
  if (existsSync(join(root, 'Makefile'))) {
    const text = readFileSync(join(root, 'Makefile'), 'utf8');
    for (const target of ['test', 'lint', 'check', 'ci']) {
      if (new RegExp(`^${target}:`, 'm').test(text)) add('Makefile', `make ${target}`);
    }
  }
  return found;
}
