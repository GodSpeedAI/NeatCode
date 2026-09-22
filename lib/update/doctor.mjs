// NeatCode doctor: diagnostic subsystem for NeatCode distribution and installations.
//
// Invariants:
// Components derive coherence from the distribution version/integrity state.
// No fake component version numbers.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkills } from '../env/skills.mjs';
import { runGuards, validateGuardResult } from '../guards/index.mjs';
import { classifyInstallation, computeSkillManifest, getCanonicalSkillDir, readSkillVersion } from './sync.mjs';
import { fetchPackageMetadata } from './registry.mjs';
import { resolveUpdateCandidates } from './policy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

export async function runDoctor({
  home = homedir(),
  project = null,
  checkRemote = true,
  registryUrl,
  fetchImpl,
  now = new Date(),
} = {}) {
  const issues = [];
  const warnings = [];

  // 1. Distribution Checks
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const canonicalVersion = pkg.version;

  const skillMdPath = join(ROOT, 'skills', 'neatcode', 'SKILL.md');
  const skillVersion = readSkillVersion(skillMdPath);
  const skillCoherent = skillVersion === canonicalVersion;
  if (!skillCoherent) {
    issues.push(`Skill version drift: SKILL.md (${skillVersion}) != package.json (${canonicalVersion})`);
  }

  // Guards coherence check
  let guardsCoherent = false;
  try {
    const result = runGuards({ root: ROOT, paths: [] });
    const problems = validateGuardResult(result);
    guardsCoherent = problems.length === 0 && result.failures.length === 0;
  } catch {
    guardsCoherent = false;
  }
  if (!guardsCoherent) {
    issues.push('Deterministic guards report validation errors or failure');
  }

  // References integrity check
  let referencesCoherent = true;
  try {
    const rawSkill = readFileSync(skillMdPath, 'utf8');
    const links = [...rawSkill.matchAll(/\[[^\]]*\]\(([^)\s#]+)\)/g)].map((m) => m[1]);
    for (const link of links) {
      if (!existsSync(resolve(dirname(skillMdPath), link))) {
        referencesCoherent = false;
        issues.push(`Broken skill reference link: ${link}`);
        break;
      }
    }
  } catch {
    referencesCoherent = false;
  }

  const distribution = {
    cliVersion: canonicalVersion,
    skillVersion: skillVersion ?? 'unknown',
    skillCoherent,
    guardsCoherent,
    referencesCoherent,
    coherent: skillCoherent && guardsCoherent && referencesCoherent,
  };

  // 2. Installations Checks
  const canonicalDir = getCanonicalSkillDir(home);
  const canonicalManifest = existsSync(canonicalDir) ? computeSkillManifest(canonicalDir) : null;
  const discovered = discoverSkills({ home, project });

  const installations = [];
  let repairableCount = 0;

  for (const root of discovered.roots.filter((r) => r.exists)) {
    const targetDir = join(root.path, 'neatcode');
    const classification = classifyInstallation(targetDir, {
      distributionVersion: canonicalVersion,
      canonicalDir,
      canonicalManifest,
    });

    const agentLabel = root.usedBy.join(', ');
    let displayStatus = 'unknown';
    let mark = '?';
    let isRepairable = false;

    switch (classification.status) {
      case 'managed-linked':
        if (classification.stale) {
          displayStatus = 'stale managed link';
          mark = '!';
          isRepairable = true;
        } else {
          displayStatus = 'linked · current';
          mark = '✓';
        }
        break;
      case 'managed-copy':
        if (classification.stale) {
          displayStatus = 'stale managed copy';
          mark = '!';
          isRepairable = true;
        } else {
          displayStatus = 'copied · current';
          mark = '✓';
        }
        break;
      case 'unmanaged-clean':
        displayStatus = 'unmanaged clean copy';
        mark = '!';
        isRepairable = true;
        break;
      case 'unmanaged-modified':
        displayStatus = 'locally modified';
        mark = '!';
        isRepairable = false;
        warnings.push(`Locally modified skill at ${targetDir} (protected from overwrite)`);
        break;
      case 'skills-manager-managed':
        displayStatus = 'managed by skills manager';
        mark = '✓';
        break;
      case 'absent':
        displayStatus = 'not installed';
        mark = '·';
        isRepairable = true;
        break;
      default:
        displayStatus = classification.reason;
        mark = '!';
        isRepairable = true;
    }

    if (isRepairable) repairableCount++;

    installations.push({
      agent: agentLabel,
      path: targetDir,
      status: classification.status,
      displayStatus,
      mark,
      version: classification.version,
      isRepairable,
    });
  }

  // 3. Release Checks
  let release = {
    installed: canonicalVersion,
    latestEligible: null,
    latestPublished: null,
    soaking: false,
    checkedRemote: false,
  };

  if (checkRemote) {
    try {
      const meta = await fetchPackageMetadata({ registryUrl, fetchImpl, timeoutMs: 5000 });
      const plan = resolveUpdateCandidates({
        installedVersion: canonicalVersion,
        versions: meta.versions,
        time: meta.time,
        now,
      });
      release = {
        installed: canonicalVersion,
        latestEligible: plan.latestEligible,
        latestPublished: plan.latestPublished,
        soaking: !!plan.soakingReleases.some((s) => s.version === plan.latestPublished),
        checkedRemote: true,
      };
    } catch {
      release.checkedRemote = false;
    }
  }

  return {
    distribution,
    installations,
    release,
    repairableCount,
    issues,
    warnings,
  };
}

/**
 * Format doctor report for terminal display.
 */
export function formatDoctorHuman(doc) {
  const lines = ['NeatCode doctor', ''];

  lines.push('Distribution');
  lines.push(`  ${doc.distribution.skillCoherent ? '✓' : 'X'} CLI            ${doc.distribution.cliVersion}`);
  lines.push(`  ${doc.distribution.skillCoherent ? '✓' : 'X'} skill          ${doc.distribution.skillVersion}`);
  lines.push(`  ${doc.distribution.guardsCoherent ? '✓' : 'X'} guards         ${doc.distribution.guardsCoherent ? 'coherent' : 'failing'}`);
  lines.push(`  ${doc.distribution.referencesCoherent ? '✓' : 'X'} references     ${doc.distribution.referencesCoherent ? 'coherent' : 'failing'}`);
  lines.push('');

  lines.push('Installations');
  if (!doc.installations.length) {
    lines.push('  (no agent skill directories found)');
  } else {
    for (const inst of doc.installations) {
      lines.push(`  ${inst.mark} ${inst.agent.padEnd(16)} ${inst.displayStatus}`);
    }
  }
  lines.push('');

  lines.push('Release');
  lines.push(`  ✓ installed      ${doc.release.installed}`);
  if (doc.release.checkedRemote) {
    lines.push(`  ✓ latest eligible ${doc.release.latestEligible ?? doc.release.installed}`);
    if (doc.release.latestPublished && doc.release.latestPublished !== doc.release.latestEligible) {
      lines.push(`  ◷ latest published ${doc.release.latestPublished} (soaking)`);
    }
  } else {
    lines.push('  · remote check   skipped/offline');
  }
  lines.push('');

  lines.push('Result');
  if (doc.issues.length) {
    lines.push(`${doc.issues.length} distribution issue(s) detected:`);
    for (const issue of doc.issues) lines.push(`  - ${issue}`);
  } else if (doc.repairableCount > 0) {
    lines.push(`${doc.repairableCount} repairable installation issue(s)`);
    lines.push('');
    lines.push('Run:');
    lines.push('  neatcode update --repair');
  } else {
    lines.push('All systems coherent.');
  }

  return lines.join('\n') + '\n';
}
