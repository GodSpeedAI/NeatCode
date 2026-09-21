// JavaScript/TypeScript guard contracts: each ported rule fires on a real
// violation and stays silent on a legitimate near-neighbor.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJavaScript } from '../lib/guards/javascript.mjs';
import { isKnownFamily } from '../lib/guards/taxonomy.mjs';

const run = (source, path = 'a.ts') =>
  analyzeJavaScript({ path, source, language: 'typescript' }).findings;

const rules = (findings) => findings.map((f) => f.rule_id);

function validShape(t, findings) {
  for (const f of findings) {
    t.assert.ok(f.rule_id.startsWith('neatcode/js/'), 'rule id namespace');
    t.assert.ok(isKnownFamily(f.neatcode_family), 'known family');
    t.assert.ok(f.upstream_rule_id?.startsWith('anti-slop/'), 'upstream provenance');
    t.assert.equal(f.language, 'typescript');
    t.assert.equal(f.deterministic, true);
    t.assert.ok(f.line >= 1 && f.column >= 1, 'positions point at the file');
  }
}

test('chained assertions fire; single assertions do not (as such)', (t) => {
  const bad = run('const v = data as string as number;');
  t.assert.ok(rules(bad).includes('neatcode/js/no-chained-assertions'));
  validShape(t, bad);
  // A single assertion is owned by the safety-comment rule, not the chained rule.
  const single = run('// SAFETY: decoded above.\nconst v = data as string;');
  t.assert.ok(!rules(single).includes('neatcode/js/no-chained-assertions'));
  t.assert.equal(single.length, 0);
});

test('known-value widening + widen-then-assert on const flows', (t) => {
  const findings = run('const x: unknown = { a: 1 };\nconst y = x as { a: number };');
  t.assert.ok(rules(findings).includes('neatcode/js/no-known-value-widening'));
  t.assert.ok(rules(findings).includes('neatcode/js/no-widen-then-assert'));
  // Unknown initializer: no evidence, no widening finding.
  const unknownInit = run('declare const input: unknown;\nconst x: unknown = input;');
  t.assert.ok(!rules(unknownInit).includes('neatcode/js/no-known-value-widening'));
  // Narrow-to-narrow assertion without widening: not laundering.
  const narrow = run('const x = { a: 1 };\nconst y = x as { a: number };');
  t.assert.ok(!rules(narrow).includes('neatcode/js/no-widen-then-assert'));
});

test('broad contracts: params, returns, aliases, dictionaries, object', (t) => {
  const findings = run(
    [
      'function f(input: unknown, opts: object): unknown { return input; }',
      'type Alias = any;',
      'const rec: Record<string, unknown> = {};',
      'function g(): Promise<any> { return null; }',
    ].join('\n'),
  );
  const ids = rules(findings);
  for (const expected of [
    'neatcode/js/no-unknown-parameters',
    'neatcode/js/no-object-parameters',
    'neatcode/js/no-unknown-returns',
    'neatcode/js/no-unknown-type-aliases',
    'neatcode/js/no-unsafe-dictionary-type',
  ]) {
    t.assert.ok(ids.includes(expected), `missing ${expected}`);
  }
  // Named types are the legitimate near-neighbor.
  const clean = run(
    'interface Input { id: string; }\nfunction f(input: Input): string { return input.id; }',
  );
  t.assert.equal(clean.length, 0);
});

test('runtime typeof fires only on widened evidence; Reflect dispatch fires', (t) => {
  const findings = run(
    'const mode: unknown = "auto";\nif (typeof mode === "string") {\n  const v = Reflect.get(obj, key);\n}',
  );
  t.assert.ok(rules(findings).includes('neatcode/js/no-runtime-typeof'));
  t.assert.ok(rules(findings).includes('neatcode/js/no-reflect-get'));
  // Narrowing a genuinely unknown parameter is idiomatic, not evidence loss
  // (the broad signature itself still reports, as it should).
  const narrowed = run('function f(mode: unknown) {\n  if (typeof mode === "string") {}\n}');
  t.assert.ok(!rules(narrowed).includes('neatcode/js/no-runtime-typeof'));
  t.assert.ok(rules(narrowed).includes('neatcode/js/no-unknown-parameters'));
  // Ordinary method calls are not reflective dispatch.
  t.assert.equal(run('const v = obj.get(key);').length, 0);
});

test('module mocking fires in tests; DI does not', (t) => {
  const mocked = run("vi.mock('../db');", 'a.test.ts');
  t.assert.ok(rules(mocked).includes('neatcode/js/no-module-mocking'));
  t.assert.equal(run('const db = new FakeDb();').length, 0);
});

test('assertions need SAFETY justification; const assertions are exempt', (t) => {
  const bare = run('const v = data as string;');
  t.assert.ok(rules(bare).includes('neatcode/js/require-safety-comment-for-type-assertion'));
  const justified = run('// SAFETY: validated by schema above.\nconst v = data as string;');
  t.assert.equal(justified.length, 0);
  const sameLine = run('const v = data as string; // SAFETY: checked');
  t.assert.equal(sameLine.length, 0);
  t.assert.equal(run('const v = ["a"] as const;').length, 0);
});

test('shape in symbol names fires on declarations only', (t) => {
  const findings = run('function load_shape_data() {\n  return shape;\n}');
  t.assert.ok(rules(findings).includes('neatcode/js/no-shape-in-symbol-names'));
  // Borrowed member access (`data.shape`) is not a declaration.
  t.assert.equal(run('const s = data.shape;').length, 0);
});

test('comments and strings never trigger findings', (t) => {
  const findings = run(
    [
      '// const x: unknown = {} as string as number',
      '/* Reflect.get(a, b) */',
      'const label = "typeof mode === string";',
      'const q = `vi.mock(x)`;',
    ].join('\n'),
  );
  t.assert.equal(findings.length, 0);
});
