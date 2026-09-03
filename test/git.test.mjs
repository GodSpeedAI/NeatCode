import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GitError,
  acquireDiff,
  currentBranch,
  headRev,
  isGitRepo,
  parseRange,
  repoRoot,
  trackedFiles,
  workingTreeStatus,
} from '../lib/git.mjs';

test('parseRange parses two-dot and three-dot ranges', () => {
  assert.deepEqual(parseRange('main..feature'), { base: 'main', head: 'feature', symmetric: false });
  assert.deepEqual(parseRange('origin/main...HEAD'), { base: 'origin/main', head: 'HEAD', symmetric: true });
  assert.deepEqual(parseRange('v1.0.0..'), { base: 'v1.0.0', head: '', symmetric: false });

  assert.throws(() => parseRange('not-a-range'), GitError);
  assert.throws(() => parseRange('..feature'), GitError);
  assert.throws(() => parseRange(123), GitError);
});

test('repoRoot and isGitRepo report accurately', () => {
  const root = repoRoot(process.cwd());
  assert.ok(typeof root === 'string' && root.length > 0);
  assert.equal(isGitRepo(process.cwd()), true);

  const tmp = mkdtempSync(join(tmpdir(), 'non-git-'));
  try {
    assert.equal(isGitRepo(tmp), false);
    assert.throws(() => repoRoot(tmp), GitError);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('headRev and currentBranch return valid revisions for the current repo', () => {
  const head = headRev(process.cwd());
  assert.ok(typeof head === 'string' && /^[0-9a-f]{40}$/.test(head));

  const branch = currentBranch(process.cwd());
  assert.ok(typeof branch === 'string' && branch.length > 0);
});

test('trackedFiles and workingTreeStatus return arrays', () => {
  const files = trackedFiles(process.cwd());
  assert.ok(Array.isArray(files) && files.length > 10);
  assert.ok(files.includes('package.json'));

  const status = workingTreeStatus(process.cwd());
  assert.ok(Array.isArray(status));
  for (const entry of status) {
    assert.ok(typeof entry.code === 'string');
    assert.ok(typeof entry.path === 'string');
  }
});
