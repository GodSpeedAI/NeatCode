// Rust guard contracts: every NeatCode-owned rule fires on a real violation
// and stays silent on a legitimate near-neighbor. No rule may ship without
// both sides demonstrated.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRust } from '../lib/guards/rust.mjs';
import { isKnownFamily } from '../lib/guards/taxonomy.mjs';

const run = (source, path = 'src/lib.rs') => analyzeRust({ path, source });
const rules = (r) => r.findings.map((f) => f.rule_id);

function validShape(t, findings) {
  for (const f of findings) {
    t.assert.ok(f.rule_id.startsWith('neatcode/rust/'), 'rule id namespace');
    t.assert.ok(isKnownFamily(f.neatcode_family), 'known family');
    t.assert.equal(f.upstream_rule_id, null, 'NeatCode-owned rules carry no upstream id');
    t.assert.equal(f.language, 'rust');
    t.assert.equal(f.deterministic, true);
    t.assert.ok(f.line >= 1 && f.column >= 1, 'positions point at the file');
  }
}

test('R01: unsafe without SAFETY fires; justified unsafe does not', (t) => {
  const bad = run('fn f(p: *const u8) -> u8 {\n  unsafe { *p }\n}');
  t.assert.ok(rules(bad).includes('neatcode/rust/unsafe-without-safety-comment'));
  validShape(t, bad.findings);
  const good = run(
    'fn f(p: *const u8) -> u8 {\n  // SAFETY: p is non-null and aligned, checked by caller.\n  unsafe { *p }\n}',
  );
  t.assert.equal(good.findings.length, 0);
});

test('R10: transmute without SAFETY fires; justified transmute does not', (t) => {
  const bad = run('fn f(x: u32) -> f32 {\n  unsafe { std::mem::transmute(x) }\n}');
  // unsafe is justified nowhere either, so both fire — the test only requires transmute.
  t.assert.ok(rules(bad).includes('neatcode/rust/transmute-without-safety-comment'));
  const good = run(
    'fn f(x: u32) -> f32 {\n  // SAFETY: u32 and f32 share layout; NaN is acceptable here.\n  unsafe { std::mem::transmute(x) }\n}',
  );
  t.assert.equal(good.findings.length, 0);
});

test('R02/R03: dyn Any erasure and downcast recovery fire', (t) => {
  const r = run(
    'use std::any::Any;\nfn f(store: Box<dyn Any>) {\n  let x = store.downcast_ref::<String>();\n}',
  );
  t.assert.ok(rules(r).includes('neatcode/rust/dyn-any-erasure'));
  t.assert.ok(rules(r).includes('neatcode/rust/erase-then-downcast'));
  // A trait object that keeps a contract is not evidence erasure.
  t.assert.equal(run('fn f(w: &mut dyn Write) {}').findings.length, 0);
});

test('R04: broad dynamic errors fire in library code; tests and main are exempt', (t) => {
  const r = run('fn f() -> Result<String, anyhow::Error> {\n  Ok(String::new())\n}');
  t.assert.ok(rules(r).includes('neatcode/rust/broad-dynamic-error'));
  const boxed = run('fn f(err: Box<dyn Error>) {}');
  t.assert.ok(rules(boxed).includes('neatcode/rust/broad-dynamic-error'));
  const localEnum = run('enum E { Io }\nfn f() -> Result<String, E> {\n  Ok(String::new())\n}');
  t.assert.equal(localEnum.findings.length, 0);
  const inTest = run('fn f() -> Result<(), anyhow::Error> {\n  Ok(())\n}', 'tests/api.rs');
  t.assert.equal(inTest.findings.length, 0);
  const inMain = run('fn main() -> Result<(), anyhow::Error> {\n  Ok(())\n}', 'src/main.rs');
  t.assert.equal(inMain.findings.length, 0);
});

test('R05: TypeId dispatch fires; enum dispatch does not', (t) => {
  const r = run('fn f(v: &dyn Any) {\n  if TypeId::of::<String>() == v.type_id() {}\n}');
  t.assert.ok(rules(r).includes('neatcode/rust/typeid-driven-dispatch'));
  t.assert.ok(rules(r).includes('neatcode/rust/dyn-any-erasure'));
  t.assert.equal(run('enum K { A, B }\nfn f(k: K) {\n  match k {\n    K::A => {},\n    K::B => {},\n  }\n}').findings.length, 0);
});

test('R06: Value escaping the boundary fires; parsing locals do not', (t) => {
  const r = run('fn load() -> serde_json::Value {\n  serde_json::json!({})\n}');
  t.assert.ok(rules(r).includes('neatcode/rust/untyped-value-escapes-boundary'));
  const field = run('struct Cfg {\n  data: serde_json::Value,\n}');
  t.assert.ok(rules(field).includes('neatcode/rust/untyped-value-escapes-boundary'));
  const local = run('fn f(raw: &str) {\n  let v: serde_json::Value = serde_json::from_str(raw).unwrap();\n}');
  t.assert.ok(!rules(local).includes('neatcode/rust/untyped-value-escapes-boundary'));
});

test('R07: panic macros fire in library code; tests are exempt', (t) => {
  const r = run('fn f() {\n  todo!("later")\n}');
  t.assert.ok(rules(r).includes('neatcode/rust/panic-macro-in-library'));
  const inTest = run('fn f() {\n  todo!("later")\n}', 'src/a_test.rs');
  t.assert.equal(inTest.findings.length, 0);
  // Result-returning code is the legitimate near-neighbor.
  t.assert.equal(run('fn f() -> Result<(), E> {\n  Err(E)\n}').findings.length, 0);
});

test('R09: dynamic-map domain fields fire; typed maps do not', (t) => {
  const r = run('struct Cfg {\n  data: HashMap<String, serde_json::Value>,\n}');
  t.assert.ok(rules(r).includes('neatcode/rust/dynamic-map-domain-model'));
  t.assert.equal(run('struct Cfg {\n  ports: HashMap<String, u16>,\n}').findings.length, 0);
});

test('comments and strings never trigger findings', (t) => {
  const r = run('// unsafe { todo!() }\nfn f() {\n  let s = "Box<dyn Any>";\n}');
  t.assert.equal(r.findings.length, 0);
});
