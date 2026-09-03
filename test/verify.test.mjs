import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverChecks, runCheck, runChecks } from '../lib/verify.mjs';

test('discoverChecks finds declared npm verification commands', () => {
  const checks = discoverChecks(process.cwd());
  assert.ok(checks.length > 0);
  assert.ok(checks.some((c) => c.source === 'package.json' && c.command === 'npm run test'));
});

test('runCheck records passed and failed verification executions', () => {
  const passed = runCheck('node -e "console.log(\\"ok\\"); process.exit(0)"');
  assert.equal(passed.ran, true);
  assert.equal(passed.status, 'passed');
  assert.equal(passed.exitCode, 0);
  assert.ok(passed.summary.includes('ok'));

  const failed = runCheck('node -e "console.error(\\"err\\"); process.exit(42)"');
  assert.equal(failed.ran, true);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.exitCode, 42);
  assert.ok(failed.summary.includes('err'));
});

test('runChecks maps multiple commands sequentially', () => {
  const results = runChecks(['node -e "process.exit(0)"', 'node -e "process.exit(1)"']);
  assert.equal(results.length, 2);
  assert.equal(results[0].status, 'passed');
  assert.equal(results[1].status, 'failed');
});
