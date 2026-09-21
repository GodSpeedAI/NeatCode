// Guard orchestration: mixed-language runs, exclusions, output stability,
// and diff-relative classification.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGuards, validateGuardResult } from '../lib/guards/index.mjs';
import { collectGuardFiles } from '../lib/guards/dispatch.mjs';
import { classifyFindings, countByRuleAndPath } from '../lib/guards/diffclass.mjs';

function withTree(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'neatcode-guards-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      const abs = join(dir, name);
      mkdirSync(join(abs, '..'), { recursive: true });
      writeFileSync(abs, content);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const TS_BAD = 'const x: unknown = { a: 1 };\nconst y = x as { a: number };\n';
const GO_BAD = 'package a\nfunc f(v any) string {\n  return v.(string)\n}\n';
const RS_BAD = 'fn f() {\n  todo!("later")\n}\n';

test('mixed-language repository runs only applicable analyzers', (t) => {
  withTree(
    {
      'a.ts': TS_BAD,
      'b.go': GO_BAD,
      'c.rs': RS_BAD,
      'd.txt': 'nothing scannable here',
      'e.md': '# docs',
    },
    (dir) => {
      const result = runGuards({ root: dir });
      t.assert.equal(result.ran, true);
      const langs = result.languages.map((l) => l.language).sort();
      t.assert.deepEqual(langs, ['go', 'rust', 'typescript']);
      t.assert.ok(result.findings.length >= 3, `expected findings, got ${result.findings.length}`);
      t.assert.equal(result.clean, false);
      t.assert.deepEqual(validateGuardResult(result), []);
      // Per-language filtering works.
      const rustOnly = runGuards({ root: dir, languages: ['rust'] });
      t.assert.deepEqual(rustOnly.languages.map((l) => l.language), ['rust']);
    },
  );
});

test('generated, vendor, and upstream-reference paths are excluded by default', (t) => {
  withTree(
    {
      'src/a.ts': TS_BAD,
      'dist/bundle.js': 'const v = data as string as number;',
      'node_modules/dep/index.js': 'const v = data as string as number;',
      'guards/js-ts/upstream/rules/no-chained-type-assertions.ts':
        'const v = data as string as number;',
    },
    (dir) => {
      const files = collectGuardFiles(dir, {});
      t.assert.deepEqual(files.map((f) => f.rel), ['src/a.ts']);
      const all = collectGuardFiles(dir, { includeGenerated: true, includeVendored: true });
      t.assert.ok(all.length > 1, 'opt-out restores excluded files');
    },
  );
});

test('JSON output is stable and validates', (t) => {
  withTree({ 'a.ts': TS_BAD }, (dir) => {
    const a = runGuards({ root: dir });
    const b = runGuards({ root: dir });
    t.assert.equal(JSON.stringify(a), JSON.stringify(b));
    const json = JSON.parse(JSON.stringify(a));
    t.assert.equal(json.ran, true);
    t.assert.ok(Array.isArray(json.findings));
    for (const f of json.findings) {
      t.assert.ok(f.rule_id && f.neatcode_family && f.path && f.message);
      t.assert.equal(f.deterministic, true);
    }
  });
});

test('classification: introduced vs pre-existing vs exposed vs resolved', (t) => {
  const now = [
    { rule_id: 'r1', path: 'a.ts', line: 10 }, // added line, new rule -> introduced
    { rule_id: 'r2', path: 'a.ts', line: 11 }, // added line, rule existed -> worsened
    { rule_id: 'r2', path: 'a.ts', line: 12 }, // added line, rule existed -> worsened
    { rule_id: 'r3', path: 'a.ts', line: 3 }, // context line, rule existed -> pre-existing
    { rule_id: 'r4', path: 'a.ts', line: 4 }, // context line, rule new -> exposed
  ];
  const base = [
    { rule_id: 'r2', path: 'a.ts', line: 11 },
    { rule_id: 'r3', path: 'a.ts', line: 3 },
    { rule_id: 'r9', path: 'a.ts', line: 7 }, // gone now -> resolved
  ];
  const { classified, resolved, counts } = classifyFindings({
    findings: now,
    baselineCounts: countByRuleAndPath(base),
    addedLines: new Map([['a.ts', new Set([10, 11, 12])]]),
    touchedFiles: new Set(['a.ts']),
  });
  const byLine = Object.fromEntries(classified.map((f) => [f.line, f.provenance]));
  t.assert.equal(byLine[10], 'introduced');
  t.assert.equal(byLine[11], 'worsened');
  t.assert.equal(byLine[12], 'worsened');
  t.assert.equal(byLine[3], 'pre-existing');
  t.assert.equal(byLine[4], 'exposed');
  t.assert.deepEqual(resolved, [{ rule_id: 'r9', path: 'a.ts', baseline_count: 1 }]);
  t.assert.deepEqual(counts, { introduced: 1, worsened: 2, exposed: 1, preExisting: 1, resolved: 1 });
});

test('unknown language is a usage error, not a silent skip', (t) => {
  t.assert.throws(() => runGuards({ root: '/tmp', languages: ['cobol'] }), /unknown language/);
});

test('python baselines run through the same engine (introduced vs pre-existing)', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'neatcode-guardbase-py-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  try {
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    writeFileSync(
      join(dir, 'a.py'),
      'from typing import Any\ndef old(x: Any) -> int:\n    return 1\n',
    );
    git('add', '-A');
    git('commit', '-q', '-m', 'initial');
    writeFileSync(
      join(dir, 'a.py'),
      'from typing import Any\ndef old(x: Any) -> int:\n    return 1\ndef new(x: Any) -> Any:\n    return x\n',
    );
    git('add', 'a.py');

    const probe = runGuards({ root: dir, languages: ['python'] });
    if (probe.languages.length === 0 || probe.failures.some((f) => f.reason === 'runtime-missing')) {
      t.assert.ok(true, 'no suitable python3: baseline path untestable here');
      return;
    }
    const result = runGuards({ root: dir, languages: ['python'], baseline: 'HEAD', diffSource: { mode: 'staged' } });
    t.assert.deepEqual(validateGuardResult(result), []);
    const byRuleLine = result.findings.map((f) => `${f.rule_id}:${f.line}:${f.provenance}`);
    // new() violations are added lines -> introduced; old() param -> pre-existing.
    t.assert.ok(byRuleLine.includes('neatcode/py/no-any-returns:4:introduced'), `got: ${byRuleLine}`);
    t.assert.ok(byRuleLine.includes('neatcode/py/no-any-parameters:2:pre-existing'), `got: ${byRuleLine}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unreadable roots yield an empty scope, not a crash', (t) => {
  const result = runGuards({ root: join(tmpdir(), 'neatcode-no-such-dir-xyz') });
  t.assert.equal(result.ran, true);
  t.assert.equal(result.findings.length, 0);
  t.assert.equal(result.clean, true);
  t.assert.deepEqual(validateGuardResult(result), []);
});

test('staged run labels added lines introduced and context lines pre-existing', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'neatcode-guardbase-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  try {
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    // Baseline: a pre-existing broad param on line 1.
    writeFileSync(join(dir, 'a.ts'), 'function f(input: unknown) {\n  return input;\n}\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'initial');
    // Change: append a widened binding (added lines) below the context lines.
    writeFileSync(
      join(dir, 'a.ts'),
      'function f(input: unknown) {\n  return input;\n}\nconst x: unknown = { a: 1 };\n',
    );
    git('add', 'a.ts');

    const result = runGuards({ root: dir, baseline: 'HEAD', diffSource: { mode: 'staged' } });
    t.assert.equal(result.ran, true);
    t.assert.deepEqual(validateGuardResult(result), []);
    const byRule = Object.fromEntries(result.findings.map((f) => [f.rule_id, f.provenance]));
    // The appended widening is new; the untouched param is legacy — even though
    // one hunk spans both, only `+` lines count as added.
    t.assert.equal(byRule['neatcode/js/no-known-value-widening'], 'introduced');
    t.assert.equal(byRule['neatcode/js/no-unknown-parameters'], 'pre-existing');
    t.assert.deepEqual(result.provenance, {
      introduced: 1, worsened: 0, exposed: 0, preExisting: 1, resolved: 0,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
