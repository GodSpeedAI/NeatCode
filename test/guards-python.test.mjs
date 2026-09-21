// Python guard delegation: the vendored engine runs, findings normalize,
// and failures stay failures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzePythonFiles, probePython, PYTHON_FAMILY_MAP } from '../lib/guards/python.mjs';
import { isKnownFamily } from '../lib/guards/taxonomy.mjs';

const probe = probePython('python3');
const HAS_PYTHON = probe?.supported === true;

function withFiles(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'neatcode-py-'));
  try {
    const abs = [];
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(dir, name), content);
      abs.push(join(dir, name));
    }
    return fn(dir, abs);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('python probe reports a usable runtime or an honest negative', (t) => {
  const p = probePython('python3');
  if (p) {
    t.assert.match(p.version, /^\d+\.\d+\.\d+/);
    t.assert.equal(typeof p.supported, 'boolean');
  } else {
    t.assert.equal(p, null);
  }
  t.assert.equal(probePython('definitely-not-a-python-binary-xyz'), null);
});

test('every mapped rule names a real taxonomy family', () => {
  for (const family of Object.values(PYTHON_FAMILY_MAP)) {
    assert.ok(isKnownFamily(family), `unknown family: ${family}`);
  }
});

test('engine violations normalize into the unified model', { skip: !HAS_PYTHON }, (t) => {
  withFiles(
    {
      'bad.py': 'from typing import Any\ndef f(x: Any) -> Any:\n    return x\n',
      'good.py': 'def f(x: int) -> int:\n    return x\n',
    },
    (dir, [bad, good]) => {
      const { findings, failures, version } = analyzePythonFiles({ root: dir, absPaths: [bad, good] });
      t.assert.ok(version, 'engine version recorded');
      t.assert.equal(failures.length, 0);
      const ids = findings.map((f) => f.rule_id);
      t.assert.ok(ids.includes('neatcode/py/no-any-parameters'), `got: ${ids}`);
      t.assert.ok(ids.includes('neatcode/py/no-any-returns'), `got: ${ids}`);
      for (const f of findings) {
        t.assert.equal(f.language, 'python');
        t.assert.equal(f.deterministic, true);
        t.assert.equal(f.source, 'upstream-engine');
        t.assert.ok(f.upstream_rule_id?.startsWith('anti-slop/'));
        t.assert.ok(f.line >= 1 && f.column >= 1);
        t.assert.ok(f.path.endsWith('bad.py'), `path stays repo-relative: ${f.path}`);
      }
      t.assert.ok(!findings.some((f) => f.path.endsWith('good.py')), 'clean file stays clean');
    },
  );
});

test('unparseable files are failures, not clean results', { skip: !HAS_PYTHON }, (t) => {
  withFiles({ 'broken.py': 'def f(:\n  pass\n' }, (dir, [broken]) => {
    const { findings, failures } = analyzePythonFiles({ root: dir, absPaths: [broken] });
    t.assert.equal(findings.length, 0);
    t.assert.equal(failures.length, 1);
    t.assert.equal(failures[0].reason, 'file-failed');
  });
});

test('missing runtime reports not-runnable, never passed', () => {
  const { findings, failures } = analyzePythonFiles({
    root: '/tmp',
    absPaths: ['/tmp/x.py'],
    pythonBin: 'definitely-not-a-python-binary-xyz',
  });
  assert.equal(findings.length, 0);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].reason, 'runtime-missing');
});
