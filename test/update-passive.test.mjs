// Tests for lightweight passive update notification.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CACHE_TTL_MS,
  formatPassiveNotice,
  passiveUpdateCheck,
  readCachedCheck,
  writeCachedCheck,
} from '../lib/update/passive.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('formatPassiveNotice formats eligible release notification', () => {
  const plan = {
    latestEligible: '1.6.0',
    latestPublished: '1.6.0',
    soakingReleases: [],
  };
  const notice = formatPassiveNotice(plan, '1.5.0');
  assert.equal(notice, 'NeatCode 1.6.0 is available (installed 1.5.0).\nRun: neatcode update\n');
});

test('formatPassiveNotice formats soaking release notification', () => {
  const plan = {
    latestEligible: '1.5.0',
    latestPublished: '1.6.0',
    soakingReleases: [{ version: '1.6.0' }],
  };
  const notice = formatPassiveNotice(plan, '1.5.0');
  assert.equal(
    notice,
    'NeatCode 1.6.0 has been published and is in its 24h soak window.\nInstalled 1.5.0 remains current for normal updates.\n',
  );
});

test('formatPassiveNotice returns null when installed is current and nothing soaking', () => {
  const plan = {
    latestEligible: '1.5.0',
    latestPublished: '1.5.0',
    soakingReleases: [],
  };
  assert.equal(formatPassiveNotice(plan, '1.5.0'), null);
});

test('readCachedCheck and writeCachedCheck handle 24h TTL correctly', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'neatcode-cache-test-'));
  const cacheFile = join(tmpDir, 'cache', 'update-check.json');
  const now = new Date('2026-09-22T12:00:00.000Z');

  try {
    writeCachedCheck(cacheFile, { latestEligible: '1.6.0' }, now);

    // Within TTL (1 hour later)
    const fresh = readCachedCheck(cacheFile, new Date(now.getTime() + 3600 * 1000));
    assert.ok(fresh);
    assert.equal(fresh.latestEligible, '1.6.0');

    // Expired (25 hours later)
    const expired = readCachedCheck(cacheFile, new Date(now.getTime() + (CACHE_TTL_MS + 1000)));
    assert.equal(expired, null);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('honors NEATCODE_NO_UPDATE_CHECK=1 opt-out', async () => {
  process.env.NEATCODE_NO_UPDATE_CHECK = '1';
  try {
    const notice = await passiveUpdateCheck({
      installedVersion: '1.0.0',
      emitNotice: false,
    });
    assert.equal(notice, null);
  } finally {
    delete process.env.NEATCODE_NO_UPDATE_CHECK;
  }
});
