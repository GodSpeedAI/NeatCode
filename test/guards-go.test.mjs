// Go guard contracts: ported G-rules fire on violations and respect the
// upstream exemptions that survive syntax-level detection.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeGo } from '../lib/guards/go.mjs';

const run = (source, path = 'a.go') => analyzeGo({ path, source });
const rules = (r) => r.findings.map((f) => f.rule_id);

test('G01: single-result assertion needs a justification comment', (t) => {
  const bare = run('package a\nfunc f(v any) string {\n  return v.(string)\n}');
  t.assert.ok(rules(bare).includes('neatcode/go/require-assertion-justification'));
  const justified = run('package a\nfunc f(v any) string {\n  // invariant: decoded upstream\n  return v.(string)\n}');
  t.assert.ok(!rules(justified).includes('neatcode/go/require-assertion-justification'));
  const commaOk = run('package a\nfunc f(v any) string {\n  s, ok := v.(string)\n  if (!ok) { panic("x") }\n  return s\n}');
  // comma-ok is checked code; the panic inside needs its own justification, but G01 stays silent.
  t.assert.ok(!rules(commaOk).includes('neatcode/go/require-assertion-justification'));
});

test('G02/G04: untyped maps and any results fire; named types do not', (t) => {
  const r = run('package a\nfunc f(m map[string]any) any {\n  return m["k"]\n}');
  t.assert.ok(rules(r).includes('neatcode/go/no-untyped-map'));
  t.assert.ok(rules(r).includes('neatcode/go/no-any-return'));
  const clean = run('package a\ntype Headers map[string]string\nfunc f(h Headers) string {\n  return h["k"]\n}');
  t.assert.equal(clean.findings.length, 0);
});

test('G05: chained and binding laundering fire; unknown conversions do not', (t) => {
  const chained = run('package a\nfunc f(v Item) string {\n  return any(v).(string)\n}');
  t.assert.ok(rules(chained).includes('neatcode/go/no-laundering'));
  const binding = run(
    'package a\nfunc f() string {\n  var w any = Item{Name: "x"}\n  return w.(Item).Name\n}',
  );
  t.assert.ok(rules(binding).includes('neatcode/go/no-laundering'));
  // any(unknown) is a real question, not laundering.
  const unknownConv = run('package a\nfunc f(v any) any {\n  return any(v)\n}');
  t.assert.ok(!rules(unknownConv).includes('neatcode/go/no-laundering'));
});

test('G03/G02: any-alias and map-alias use sites fire; defined types do not', (t) => {
  const r = run('package a\ntype Payload = any\ntype Lookup = map[string]any\nfunc f(v Payload, m Lookup) {}');
  const ids = rules(r);
  t.assert.ok(ids.includes('neatcode/go/no-any-param'), `got: ${ids}`);
  t.assert.ok(ids.includes('neatcode/go/no-untyped-map'), `got: ${ids}`);
  // Defined types are domain types: silent.
  const clean = run('package a\ntype Payload any\ntype Headers map[string]any\nfunc f(v Payload, h Headers) {}');
  t.assert.equal(clean.findings.length, 0);
});

test('G03: any params fire; fmt-style variadic, cause, and CONTRACT are exempt', (t) => {
  const bad = run('package a\nfunc f(v any) {}');
  t.assert.ok(rules(bad).includes('neatcode/go/no-any-param'));
  const fmt = run('package a\nfunc infof(format string, args ...any) {}');
  t.assert.ok(!rules(fmt).includes('neatcode/go/no-any-param'));
  const cause = run('package a\nfunc wrap(cause any) error {\n  return nil\n}');
  t.assert.ok(!rules(cause).includes('neatcode/go/no-any-param'));
  const contract = run('package a\n// CONTRACT: external API sets this signature.\nfunc f(v any) {}');
  t.assert.ok(!rules(contract).includes('neatcode/go/no-any-param'));
});

test('G06: ad-hoc type switches fire outside decode contexts', (t) => {
  const bad = run('package a\nfunc f(v any) {\n  switch v.(type) {\n  case string:\n  }\n}');
  t.assert.ok(rules(bad).includes('neatcode/go/no-ad-hoc-type-switch'));
  const decode = run(
    'package jsoncodec\nfunc f(v any) {\n  switch v.(type) {\n  case string:\n  }\n}',
    'codec/decode.go',
  );
  t.assert.ok(!rules(decode).includes('neatcode/go/no-ad-hoc-type-switch'));
  // A switch on a named contract (io.Reader) is narrowing, not laundering.
  const narrow = run('package a\nimport "io"\nfunc f(r io.Reader) {\n  switch r.(type) {\n  case string:\n  }\n}');
  t.assert.ok(!rules(narrow).includes('neatcode/go/no-ad-hoc-type-switch'));
  // A switch on an error value belongs to G10, not G06.
  const onErr = run('package a\nfunc f(err error) {\n  switch err.(type) {\n  default:\n  }\n}');
  t.assert.ok(!rules(onErr).includes('neatcode/go/no-ad-hoc-type-switch'));
});

test('G07: reflect import fires; DeepEqual-only tests stay clean', (t) => {
  const bad = run('package a\nimport "reflect"\nvar _ = reflect.ValueOf(1)');
  t.assert.ok(rules(bad).includes('neatcode/go/no-reflect'));
  const clean = run(
    'package a\nimport "reflect"\nfunc TestX(t *T) {\n  if (!reflect.DeepEqual(a, b)) {}\n}',
    'a_test.go',
  );
  t.assert.equal(clean.findings.length, 0);
});

test('G08: monkey patching shapes fire in tests only', (t) => {
  const rewire = run('package a\nfunc TestX(t *T) {\n  service.Now = func() {}\n}', 'a_test.go');
  t.assert.ok(rules(rewire).includes('neatcode/go/no-monkey-patch'));
  // Production code assigning a struct field is not rewiring.
  const prod = run('package a\nfunc f(s S) {\n  s.field = 1\n}');
  t.assert.equal(prod.findings.length, 0);
});

test('G10: assertions and switches on err fire', (t) => {
  const r = run('package a\nfunc f(err error) {\n  if e, ok := err.(MyErr); ok {\n    _ = e\n  }\n}');
  t.assert.ok(rules(r).includes('neatcode/go/no-error-assert'));
  // A nil-compared call result is error-shaped even under another name.
  const shaped = run(
    'package a\nfunc f() {\n  data, gerr := load()\n  if gerr != nil {\n    return\n  }\n  _ = gerr.(MyErr)\n}',
  );
  t.assert.ok(rules(shaped).includes('neatcode/go/no-error-assert'), `got: ${rules(shaped)}`);
  // A nil-compared pointer is not error-shaped: no call assignment, no finding.
  const ptr = run('package a\nfunc f(p *Item) {\n  if p != nil {\n    _ = p\n  }\n}');
  t.assert.ok(!rules(ptr).includes('neatcode/go/no-error-assert'));
});

test('G11: unjustified process stops fire in library code; main/init/tests exempt', (t) => {
  const bad = run('package a\nfunc f() {\n  panic("boom")\n}');
  t.assert.ok(rules(bad).includes('neatcode/go/require-panic-justification'));
  const justified = run('package a\nfunc f() {\n  // invariant: unreachable after validation\n  panic("boom")\n}');
  t.assert.ok(!rules(justified).includes('neatcode/go/require-panic-justification'));
  const inMain = run('package main\nfunc main() {\n  panic("boom")\n}');
  t.assert.ok(!rules(inMain).includes('neatcode/go/require-panic-justification'));
  const inTest = run('package a\nfunc TestX(t *T) {\n  panic("boom")\n}', 'a_test.go');
  t.assert.ok(!rules(inTest).includes('neatcode/go/require-panic-justification'));
});

test('G13: error-text assertions fire in tests', (t) => {
  const r = run(
    'package a\nfunc TestX(t *T) {\n  if err.Error() != "boom" {}\n}',
    'a_test.go',
  );
  t.assert.ok(rules(r).includes('neatcode/go/no-error-text-assert'));
  const identity = run(
    'package a\nfunc TestX(t *T) {\n  if (!errors.Is(err, ErrBoom)) {}\n}',
    'a_test.go',
  );
  t.assert.equal(identity.findings.length, 0);
});

test('generated files are skipped, not scanned', (t) => {
  const r = run('// Code generated by x. DO NOT EDIT.\npackage a\nfunc f(v any) {}');
  t.assert.equal(r.findings.length, 0);
});
