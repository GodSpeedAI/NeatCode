import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandContext, likelyCallers, localImports, relatedTests } from '../lib/context.mjs';

test('localImports extracts local import paths', () => {
  const imports = localImports(process.cwd(), 'bin/neatcode.mjs');
  assert.ok(imports.includes('lib/envelope.mjs'));
  assert.ok(imports.includes('lib/verify.mjs'));
  assert.ok(imports.includes('lib/git.mjs'));
});

test('likelyCallers discovers files calling a module by stem', () => {
  const callers = likelyCallers(process.cwd(), 'lib/git.mjs');
  assert.ok(callers.length > 0);
  assert.ok(callers.includes('lib/envelope.mjs') || callers.includes('bin/neatcode.mjs'));
});

test('relatedTests identifies corresponding test files', () => {
  const tests = relatedTests(process.cwd(), 'lib/diff.mjs');
  assert.ok(tests.includes('test/diff.test.mjs'));
});

test('expandContext builds context rings with memoization options', () => {
  const rings = expandContext(process.cwd(), ['lib/envelope.mjs', 'lib/diff.mjs']);
  assert.equal(rings.length, 2);

  const envRing = rings.find((r) => r.path === 'lib/envelope.mjs');
  assert.ok(envRing);
  assert.ok(envRing.imports.includes('lib/git.mjs'));
  assert.ok(envRing.imports.includes('lib/diff.mjs'));
  assert.ok(envRing.tests.includes('test/envelope.test.mjs'));
});
