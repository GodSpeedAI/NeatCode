// Tests for 24-hour soak policy and candidate resolution.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOAK_WINDOW_MS,
  assessSoakStatus,
  formatAge,
  formatUpdateStatusHuman,
  resolveUpdateCandidates,
} from '../lib/update/policy.mjs';

test('formatAge converts milliseconds to human readable strings', () => {
  assert.equal(formatAge(30 * 1000), '30s ago');
  assert.equal(formatAge(15 * 60 * 1000), '15m ago');
  assert.equal(formatAge(4 * 60 * 60 * 1000), '4h ago');
  assert.equal(formatAge(5 * 24 * 60 * 60 * 1000), '5d ago');
  assert.equal(formatAge(-5000), 'in the future');
});

test('24-hour soak policy boundary behavior', () => {
  const baseTime = new Date('2026-09-22T12:00:00.000Z').getTime();

  // Case 1: 23 hours, 59 minutes, 59 seconds ago -> SOAKING (force required)
  const time23h59m59s = new Date(baseTime - (23 * 3600 + 59 * 60 + 59) * 1000).toISOString();
  const soak1 = assessSoakStatus(time23h59m59s, baseTime);
  assert.equal(soak1.isSoaking, true, '23h59m59s must be soaking');
  assert.equal(soak1.isEligible, false, '23h59m59s must not be normally eligible');

  // Case 2: Exactly 24 hours (86,400,000 ms) ago -> SOAKING (force required)
  // Policy rule: age <= 24h requires force
  const time24h00m00s = new Date(baseTime - SOAK_WINDOW_MS).toISOString();
  const soak2 = assessSoakStatus(time24h00m00s, baseTime);
  assert.equal(soak2.isSoaking, true, 'exact 24h must still be soaking');
  assert.equal(soak2.isEligible, false, 'exact 24h must not be normally eligible');

  // Case 3: 24 hours + 1 millisecond (86,400,001 ms) ago -> ELIGIBLE
  const time24h00m01ms = new Date(baseTime - (SOAK_WINDOW_MS + 1)).toISOString();
  const soak3 = assessSoakStatus(time24h00m01ms, baseTime);
  assert.equal(soak3.isSoaking, false, '24h + 1ms must not be soaking');
  assert.equal(soak3.isEligible, true, '24h + 1ms must be normally eligible');

  // Case 4: 24 hours + 1 second ago -> ELIGIBLE
  const time24h01s = new Date(baseTime - (SOAK_WINDOW_MS + 1000)).toISOString();
  const soak4 = assessSoakStatus(time24h01s, baseTime);
  assert.equal(soak4.isSoaking, false);
  assert.equal(soak4.isEligible, true);
});

test('missing or invalid publication timestamp fails closed', () => {
  const baseTime = new Date('2026-09-22T12:00:00.000Z').getTime();

  const missing = assessSoakStatus(null, baseTime);
  assert.equal(missing.isSoaking, true);
  assert.equal(missing.isEligible, false);

  const invalid = assessSoakStatus('not-a-date', baseTime);
  assert.equal(invalid.isSoaking, true);
  assert.equal(invalid.isEligible, false);

  const future = assessSoakStatus(new Date(baseTime + 10000).toISOString(), baseTime);
  assert.equal(future.isSoaking, true);
  assert.equal(future.isEligible, false);
});

test('candidate resolution: older eligible version selected behind soaking release', () => {
  const now = new Date('2026-09-22T12:00:00.000Z');
  const nowMs = now.getTime();

  const installedVersion = '1.3.0';
  const versions = ['1.3.0', '1.4.0', '1.5.0'];
  const time = {
    '1.3.0': new Date(nowMs - 30 * 24 * 3600 * 1000).toISOString(), // 30 days ago
    '1.4.0': new Date(nowMs - 5 * 24 * 3600 * 1000).toISOString(),  // 5 days ago (eligible)
    '1.5.0': new Date(nowMs - 4 * 3600 * 1000).toISOString(),       // 4 hours ago (soaking)
  };

  // Normal update: resolves 1.4.0 (the older eligible release)
  const normalPlan = resolveUpdateCandidates({
    installedVersion,
    versions,
    time,
    now,
    force: false,
  });

  assert.equal(normalPlan.installed, '1.3.0');
  assert.equal(normalPlan.latestEligible, '1.4.0');
  assert.equal(normalPlan.latestPublished, '1.5.0');
  assert.equal(normalPlan.targetVersion, '1.4.0');
  assert.equal(normalPlan.updateAvailable, true);
  assert.equal(normalPlan.forceRequired, false);

  // Force update: resolves 1.5.0 (the soaking release)
  const forcePlan = resolveUpdateCandidates({
    installedVersion,
    versions,
    time,
    now,
    force: true,
  });

  assert.equal(forcePlan.targetVersion, '1.5.0');
  assert.equal(forcePlan.updateAvailable, true);
});

test('candidate resolution: installed is latest eligible but newer release is soaking', () => {
  const now = new Date('2026-09-22T12:00:00.000Z');
  const nowMs = now.getTime();

  const installedVersion = '1.4.0';
  const versions = ['1.3.0', '1.4.0', '1.5.0'];
  const time = {
    '1.3.0': new Date(nowMs - 30 * 24 * 3600 * 1000).toISOString(),
    '1.4.0': new Date(nowMs - 5 * 24 * 3600 * 1000).toISOString(),  // eligible
    '1.5.0': new Date(nowMs - 4 * 3600 * 1000).toISOString(),       // soaking
  };

  const plan = resolveUpdateCandidates({
    installedVersion,
    versions,
    time,
    now,
    force: false,
  });

  assert.equal(plan.targetVersion, null, 'Normal update target is null because 1.4.0 is already installed');
  assert.equal(plan.forceRequired, true, 'Force is required to update to 1.5.0');
  assert.equal(plan.isCurrent, true, 'Considered current for normal updates');

  const human = formatUpdateStatusHuman(plan);
  assert.ok(human.includes('remains current for normal updates'));
  assert.ok(human.includes('neatcode update --force'));
});

test('candidate resolution: prereleases are excluded on stable channel', () => {
  const now = new Date('2026-09-22T12:00:00.000Z');
  const nowMs = now.getTime();

  const installedVersion = '1.1.0';
  const versions = ['1.1.0', '1.2.0-beta.1', '1.2.0-rc.0'];
  const time = {
    '1.1.0': new Date(nowMs - 30 * 24 * 3600 * 1000).toISOString(),
    '1.2.0-beta.1': new Date(nowMs - 10 * 24 * 3600 * 1000).toISOString(),
    '1.2.0-rc.0': new Date(nowMs - 5 * 24 * 3600 * 1000).toISOString(),
  };

  const plan = resolveUpdateCandidates({
    installedVersion,
    versions,
    time,
    now,
    force: false,
    includePrereleases: false,
  });

  assert.equal(plan.latestPublished, '1.1.0');
  assert.equal(plan.targetVersion, null);
  assert.equal(plan.updateAvailable, false);
});

test('candidate resolution: already on newest release', () => {
  const now = new Date('2026-09-22T12:00:00.000Z');
  const nowMs = now.getTime();

  const installedVersion = '1.5.0';
  const versions = ['1.4.0', '1.5.0'];
  const time = {
    '1.4.0': new Date(nowMs - 10 * 24 * 3600 * 1000).toISOString(),
    '1.5.0': new Date(nowMs - 3 * 24 * 3600 * 1000).toISOString(),
  };

  const plan = resolveUpdateCandidates({
    installedVersion,
    versions,
    time,
    now,
  });

  assert.equal(plan.targetVersion, null);
  assert.equal(plan.updateAvailable, false);
  assert.equal(plan.isCurrent, true);

  const human = formatUpdateStatusHuman(plan);
  assert.ok(human.includes('NeatCode 1.5.0 is up to date'));
});
