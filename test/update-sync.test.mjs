// Tests for canonical skill synchronization, agent exposure reconciliation,
// and local modification safety.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MANAGED_MANIFEST_FILE,
  classifyInstallation,
  computeSkillManifest,
  reconcileExposurePoint,
  syncCanonicalSkill,
} from '../lib/update/sync.mjs';

function setupFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'neatcode-sync-test-'));

  // Create a mock source skill
  const sourceSkill = join(dir, 'source-skill');
  mkdirSync(join(sourceSkill, 'references', 'verbs'), { recursive: true });

  writeFileSync(
    join(sourceSkill, 'SKILL.md'),
    '---\nname: neatcode\nversion: 1.2.0\n---\n# NeatCode Skill\n',
    'utf8',
  );
  writeFileSync(
    join(sourceSkill, 'references', 'verbs', 'review.md'),
    '# Review Verb\nEvidence-based review discipline.\n',
    'utf8',
  );

  return { dir, sourceSkill };
}

test('syncCanonicalSkill writes files and managed manifest with hashes', () => {
  const { dir, sourceSkill } = setupFixture();
  try {
    const canonical = join(dir, 'canonical-skill');
    const res = syncCanonicalSkill(sourceSkill, canonical, '1.2.0');

    assert.equal(res.filesCount, 2);
    assert.ok(existsSync(join(canonical, 'SKILL.md')));
    assert.ok(existsSync(join(canonical, 'references', 'verbs', 'review.md')));
    assert.ok(existsSync(join(canonical, MANAGED_MANIFEST_FILE)));

    const meta = JSON.parse(readFileSync(join(canonical, MANAGED_MANIFEST_FILE), 'utf8'));
    assert.equal(meta.version, '1.2.0');
    assert.equal(meta.managedBy, 'neatcode');
    assert.ok(meta.files['SKILL.md']);
    assert.ok(meta.files['references/verbs/review.md']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('classifyInstallation distinguishes clean, stale, and modified copies', () => {
  const { dir, sourceSkill } = setupFixture();
  try {
    const canonical = join(dir, 'canonical-skill');
    syncCanonicalSkill(sourceSkill, canonical, '1.2.0');
    const canonicalManifest = computeSkillManifest(canonical);

    // 1. Absent
    const absent = classifyInstallation(join(dir, 'non-existent'), {
      distributionVersion: '1.2.0',
      canonicalDir: canonical,
    });
    assert.equal(absent.status, 'absent');

    // 2. Verified managed copy
    const targetManaged = join(dir, 'managed-target');
    cpSync(canonical, targetManaged, { recursive: true });
    const managedClass = classifyInstallation(targetManaged, {
      distributionVersion: '1.2.0',
      canonicalDir: canonical,
      canonicalManifest,
    });
    assert.equal(managedClass.status, 'managed-copy');
    assert.equal(managedClass.isClean, true);
    assert.equal(managedClass.stale, false);

    // 3. Stale managed copy
    const targetStale = join(dir, 'stale-target');
    syncCanonicalSkill(sourceSkill, targetStale, '1.1.0');
    const staleClass = classifyInstallation(targetStale, {
      distributionVersion: '1.2.0',
      canonicalDir: canonical,
      canonicalManifest,
    });
    assert.equal(staleClass.status, 'stale');
    assert.equal(staleClass.version, '1.1.0');
    assert.equal(staleClass.stale, true);

    // 4. Locally modified copy (corrupted hash vs metadata)
    const targetModified = join(dir, 'modified-target');
    cpSync(canonical, targetModified, { recursive: true });
    // User added custom local rule into SKILL.md
    writeFileSync(join(targetModified, 'SKILL.md'), '# Customized local instructions\n', 'utf8');

    const modClass = classifyInstallation(targetModified, {
      distributionVersion: '1.2.0',
      canonicalDir: canonical,
      canonicalManifest,
    });
    assert.equal(modClass.status, 'unmanaged-modified');
    assert.equal(modClass.isClean, false);

    // 5. Unmanaged clean copy (no .neatcode-managed.json but files match canonical exactly)
    const targetClean = join(dir, 'clean-target');
    cpSync(sourceSkill, targetClean, { recursive: true });
    const cleanClass = classifyInstallation(targetClean, {
      distributionVersion: '1.2.0',
      canonicalDir: canonical,
      canonicalManifest,
    });
    assert.equal(cleanClass.status, 'unmanaged-clean');
    assert.equal(cleanClass.isClean, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('reconcileExposurePoint links canonical skill and updates stale installations', () => {
  const { dir, sourceSkill } = setupFixture();
  try {
    const canonical = join(dir, 'canonical-skill');
    syncCanonicalSkill(sourceSkill, canonical, '1.2.0');
    const canonicalManifest = computeSkillManifest(canonical);

    const agentDir = join(dir, 'claude-skills');
    mkdirSync(agentDir, { recursive: true });

    // 1. Initial link for clean/empty agent root
    const linkRes = reconcileExposurePoint(agentDir, canonical, {
      distributionVersion: '1.2.0',
      canonicalManifest,
      preferSymlink: true,
    });
    assert.ok(linkRes.success);
    assert.equal(linkRes.action, 'linked');

    const installedSkill = join(agentDir, 'neatcode');
    assert.ok(existsSync(join(installedSkill, 'SKILL.md')));

    // 2. Re-reconciling an already current link is a no-op
    const noopRes = reconcileExposurePoint(agentDir, canonical, {
      distributionVersion: '1.2.0',
      canonicalManifest,
      preferSymlink: true,
    });
    assert.ok(noopRes.success);
    assert.equal(noopRes.action, 'noop');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CRITICAL SAFETY: reconcileExposurePoint NEVER overwrites locally modified skill', () => {
  const { dir, sourceSkill } = setupFixture();
  try {
    const canonical = join(dir, 'canonical-skill');
    syncCanonicalSkill(sourceSkill, canonical, '1.2.0');
    const canonicalManifest = computeSkillManifest(canonical);

    const agentDir = join(dir, 'codex-skills');
    const modifiedTarget = join(agentDir, 'neatcode');
    mkdirSync(modifiedTarget, { recursive: true });

    // Write a customized local skill
    const customContent = '# My Custom NeatCode Tweaks\nDo not overwrite!';
    writeFileSync(join(modifiedTarget, 'SKILL.md'), customContent, 'utf8');

    // Attempt reconciliation
    const result = reconcileExposurePoint(agentDir, canonical, {
      distributionVersion: '1.2.0',
      canonicalManifest,
      preferSymlink: true,
    });

    // Verification: action was skipped and file remains unchanged
    assert.equal(result.action, 'skipped');
    assert.equal(result.success, false);
    assert.ok(result.reason.includes('preserved locally modified skill'));

    const contentAfter = readFileSync(join(modifiedTarget, 'SKILL.md'), 'utf8');
    assert.equal(contentAfter, customContent, 'Locally modified content must be preserved');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
