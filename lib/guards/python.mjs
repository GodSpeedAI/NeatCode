// Python deterministic guards: delegation to the vendored upstream engine.
//
// The vendored `anti_slop` package (guards/python/upstream, from
// zaterka/anti-slop-python; see guards/python/UPSTREAM.md) is dependency-free
// stdlib-only Python, so NeatCode executes it directly with the system
// `python3` instead of reimplementing its AST rules. Findings come back as
// JSON and are normalized into the unified NeatCode finding model; the
// upstream rule id is preserved and each rule maps to a NeatCode family.
//
// When no suitable Python runtime exists the language reports `not-runnable`
// — never clean. Rule bugs inside the engine surface as execution failures,
// matching the upstream contract that exit code 2 (the run itself failed) is
// distinct from exit code 1 (findings).

import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFinding, makeFailure } from './model.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PYTHON_UPSTREAM_DIR = join(HERE, '..', '..', 'guards', 'python', 'upstream');

export const PYTHON_FAMILY_MAP = {
  'anti-slop/no-any-parameters': 'broad-untyped-contract',
  'anti-slop/no-any-returns': 'broad-untyped-contract',
  'anti-slop/no-any-aliases': 'broad-untyped-contract',
  'anti-slop/no-object-parameters': 'broad-untyped-contract',
  'anti-slop/no-unsafe-dict-type': 'broad-untyped-contract',
  'anti-slop/no-chained-casts': 'type-laundering',
  'anti-slop/no-conditional-empty-dict-spread': 'broad-untyped-contract',
  'anti-slop/no-module-mocking': 'dependency-substitution',
  'anti-slop/no-runtime-isinstance': 'runtime-type-recovery',
  'anti-slop/no-dynamic-getattr': 'dynamic-dispatch',
  'anti-slop/no-dynamic-dispatch': 'dynamic-dispatch',
  'anti-slop/no-shape-in-symbol-names': 'stringly-typed-authority',
  'anti-slop/no-known-value-widening': 'known-value-widening',
  'anti-slop/no-widen-then-assert': 'type-laundering',
  'anti-slop/require-safety-comment-for-cast': 'unjustified-escape-hatch',
  'anti-slop/no-swallowed-exceptions': 'incomplete-failure-handling',
  'anti-slop/no-debug-prints': 'incomplete-failure-handling',
  'anti-slop/no-fstring-logging': 'incomplete-failure-handling',
  'anti-slop/no-mutable-defaults': 'incomplete-failure-handling',
  'anti-slop/no-eval-exec': 'dynamic-dispatch',
  'anti-slop/no-utcnow': 'incomplete-failure-handling',
  'anti-slop/no-trivial-asserts': 'incomplete-failure-handling',
  'anti-slop/no-async-without-await': 'incomplete-failure-handling',
  'anti-slop/no-blocking-sleep-in-async': 'incomplete-failure-handling',
  'anti-slop/no-dataclass-mutable-defaults': 'incomplete-failure-handling',
  'anti-slop/no-numbered-symbol-names': 'stringly-typed-authority',
};

function neatcodeRuleId(upstreamRule) {
  return `neatcode/py/${upstreamRule.replace(/^anti-slop\//, '')}`;
}

/** Probe for a python3 new enough to run the vendored engine (>= 3.12). */
export function probePython(pythonBin = 'python3') {
  const run = spawnSync(pythonBin, ['--version'], { encoding: 'utf8', timeout: 10_000 });
  if (run.error || run.status !== 0) return null;
  const text = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const m = /Python\s+(\d+)\.(\d+)\.(\d+)/.exec(text);
  if (!m) return null;
  const version = `${m[1]}.${m[2]}.${m[3]}`;
  if (Number(m[1]) < 3 || (Number(m[1]) === 3 && Number(m[2]) < 12)) {
    return { version, supported: false };
  }
  return { version, supported: true };
}

/**
 * Run the vendored engine over absolute file paths.
 * Returns {findings, failures, version}.
 */
export function analyzePythonFiles({ root, absPaths, pythonBin = 'python3', timeout = 120_000 }) {
  const probe = probePython(pythonBin);
  if (!probe) {
    return {
      findings: [],
      failures: [makeFailure({ language: 'python', reason: 'runtime-missing', detail: `${pythonBin} not found on PATH` })],
      version: null,
    };
  }
  if (!probe.supported) {
    return {
      findings: [],
      failures: [
        makeFailure({
          language: 'python',
          reason: 'runtime-unsupported',
          detail: `${pythonBin} is ${probe.version}; the vendored engine requires >= 3.12`,
        }),
      ],
      version: probe.version,
    };
  }
  if (!absPaths.length) return { findings: [], failures: [], version: probe.version };

  const env = { ...process.env, PYTHONPATH: PYTHON_UPSTREAM_DIR };
  const run = spawnSync(pythonBin, ['-m', 'anti_slop', '--format', 'json', ...absPaths], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (run.error) {
    return {
      findings: [],
      failures: [
        makeFailure({ language: 'python', reason: 'engine-failed', detail: run.error.message }),
      ],
      version: probe.version,
    };
  }
  // Upstream contract: 0 clean, 1 findings, 2 the run itself failed. A single
  // unparseable file still yields JSON with per-file errors, so always try the
  // payload first: only unparseable output is a global engine failure.
  let payload = null;
  let payloadError = null;
  try {
    payload = JSON.parse(run.stdout);
  } catch (error) {
    payloadError = error;
  }
  if (payload === null) {
    return {
      findings: [],
      failures: [
        makeFailure({
          language: 'python',
          reason: 'engine-failed',
          detail:
            (run.status === 2 ? `${(run.stderr ?? '').trim().slice(0, 1000)}; ` : '') +
            `unparseable engine output: ${payloadError.message}`,
        }),
      ],
      version: probe.version,
    };
  }

  const findings = [];
  const failures = [];
  for (const v of payload.violations ?? []) {
    const family = PYTHON_FAMILY_MAP[v.rule] ?? 'incomplete-failure-handling';
    findings.push(
      makeFinding({
        ruleId: neatcodeRuleId(v.rule),
        family,
        upstreamRuleId: v.rule,
        language: 'python',
        path: relative(root, v.file) || v.file,
        line: v.line,
        column: v.column ?? null,
        endLine: v.end_line ?? null,
        message: v.message,
        severity: 'warning',
        source: 'upstream-engine',
      }),
    );
  }
  for (const e of payload.errors ?? []) {
    failures.push(
      makeFailure({
        language: 'python',
        path: relative(root, e.file) || e.file,
        reason: 'file-failed',
        detail: e.error,
      }),
    );
  }
  return { findings, failures, version: probe.version };
}

export const PYTHON_EXTENSIONS = ['.py'];
