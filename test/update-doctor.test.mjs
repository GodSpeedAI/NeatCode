// Tests for NeatCode doctor diagnostic reporter.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDoctorHuman, runDoctor } from '../lib/update/doctor.mjs';

test('runDoctor verifies current repository distribution coherence', async () => {
  const doc = await runDoctor({ checkRemote: false });

  assert.equal(doc.distribution.skillCoherent, true);
  assert.equal(doc.distribution.guardsCoherent, true);
  assert.equal(doc.distribution.referencesCoherent, true);
  assert.equal(doc.distribution.coherent, true);
  assert.equal(doc.issues.length, 0);

  const human = formatDoctorHuman(doc);
  assert.ok(human.includes('NeatCode doctor'));
  assert.ok(human.includes('Distribution'));
  assert.ok(human.includes('CLI'));
  assert.ok(human.includes('skill'));
  assert.ok(human.includes('guards'));
  assert.ok(human.includes('references'));
  assert.ok(human.includes('Release'));
});

test('formatDoctorHuman reports repairable count and instructions when drifted', () => {
  const mockDoc = {
    distribution: {
      cliVersion: '1.2.0',
      skillVersion: '1.2.0',
      skillCoherent: true,
      guardsCoherent: true,
      referencesCoherent: true,
      coherent: true,
    },
    installations: [
      {
        agent: 'Claude Code',
        path: '/tmp/test/.claude/skills/neatcode',
        status: 'managed-linked',
        displayStatus: 'linked · current',
        mark: '✓',
        version: '1.2.0',
        isRepairable: false,
      },
      {
        agent: 'Codex',
        path: '/tmp/test/.codex/skills/neatcode',
        status: 'stale',
        displayStatus: 'stale managed copy',
        mark: '!',
        version: '1.1.0',
        isRepairable: true,
      },
    ],
    release: {
      installed: '1.2.0',
      latestEligible: '1.2.0',
      latestPublished: '1.2.0',
      soaking: false,
      checkedRemote: true,
    },
    repairableCount: 1,
    issues: [],
    warnings: [],
  };

  const human = formatDoctorHuman(mockDoc);
  assert.ok(human.includes('1 repairable installation issue(s)'));
  assert.ok(human.includes('Run:\n  neatcode update --repair'));
});
