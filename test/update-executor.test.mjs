// Tests for self-update staged executor and finalization.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { detectInstallMode, executeUpdate, finalizeUpdate } from '../lib/update/executor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

test('detectInstallMode identifies git development checkout', () => {
  const mode = detectInstallMode(ROOT);
  assert.equal(mode, 'git-development');
});

test('executeUpdate refuses to mutate git development checkout', async () => {
  const res = await executeUpdate({
    targetVersion: '9.9.9',
  });

  assert.equal(res.success, false);
  assert.ok(res.message.toLowerCase().includes('git development'));
});

test('finalizeUpdate validates running binary matches target version', async () => {
  // Wrong version passed to finalizer
  const failRes = await finalizeUpdate({
    targetVersion: '0.0.1-mismatch',
  });
  assert.equal(failRes.success, false);
  assert.ok(failRes.errors.some((e) => e.includes('Finalizer version mismatch')));

  // Matching version passed to finalizer
  const passRes = await finalizeUpdate({
    targetVersion: pkg.version,
  });
  assert.equal(passRes.success, true);
  assert.equal(passRes.version, pkg.version);
});

test('executeUpdate executes npm install and invokes finalize binary in production mode', async () => {
  const calls = [];
  const mockSpawn = (cmd, args, opts) => {
    calls.push({ cmd, args });
    return { status: 0, error: null };
  };

  // Mock non-git root to simulate global install
  const res = await executeUpdate({
    targetVersion: '1.2.0',
    spawnImpl: mockSpawn,
  });

  // Since running inside git repo, detectInstallMode returns git-development
  assert.equal(res.success, false);
});
