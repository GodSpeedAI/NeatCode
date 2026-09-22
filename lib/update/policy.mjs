// NeatCode release soak policy and candidate resolution.
//
// Hard invariant:
// A release whose npm publication age is 24 hours or less (<= 24h)
// may ONLY be installed by `neatcode update --force`.
// Normal update eligibility begins ONLY when release_age > 24 hours.

import { compareSemver, isPrerelease, sortSemver } from './semver.mjs';

export const SOAK_WINDOW_HOURS = 24;
export const SOAK_WINDOW_MS = SOAK_WINDOW_HOURS * 60 * 60 * 1000; // 86,400,000 ms

/**
 * Format milliseconds into concise relative age (e.g., '5d ago', '4h ago', '12m ago', '30s ago').
 * @param {number} ms
 * @returns {string}
 */
export function formatAge(ms) {
  if (ms < 0) return 'in the future';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Assess soak status for a release timestamp.
 *
 * @param {string | null | undefined} publishedIso
 * @param {Date | number} [now]
 * @returns {{
 *   publishedAt: string | null,
 *   ageMs: number | null,
 *   isSoaking: boolean,
 *   isEligible: boolean,
 *   reason: string,
 * }}
 */
export function assessSoakStatus(publishedIso, now = new Date()) {
  const referenceTime = typeof now === 'number' ? now : now.getTime();

  if (!publishedIso) {
    // Missing publication timestamp fails closed: never normally eligible!
    return {
      publishedAt: null,
      ageMs: null,
      isSoaking: true,
      isEligible: false,
      reason: 'missing publication timestamp',
    };
  }

  const pubTime = new Date(publishedIso).getTime();
  if (Number.isNaN(pubTime)) {
    return {
      publishedAt: publishedIso,
      ageMs: null,
      isSoaking: true,
      isEligible: false,
      reason: 'invalid publication timestamp',
    };
  }

  const ageMs = referenceTime - pubTime;

  // Strict boundary: ageMs <= SOAK_WINDOW_MS means soaking.
  // Only ageMs > SOAK_WINDOW_MS is eligible for normal update.
  if (ageMs <= 0) {
    return {
      publishedAt: publishedIso,
      ageMs,
      isSoaking: true,
      isEligible: false,
      reason: 'future publication timestamp',
    };
  }

  if (ageMs <= SOAK_WINDOW_MS) {
    return {
      publishedAt: publishedIso,
      ageMs,
      isSoaking: true,
      isEligible: false,
      reason: `within 24h soak window (${formatAge(ageMs)})`,
    };
  }

  return {
    publishedAt: publishedIso,
    ageMs,
    isSoaking: false,
    isEligible: true,
    reason: `eligible (${formatAge(ageMs)})`,
  };
}

/**
 * Resolve update candidate according to soak policy and requested options.
 *
 * @param {object} params
 * @param {string} params.installedVersion
 * @param {string[]} params.versions
 * @param {Record<string, string>} params.time
 * @param {Date | number} [params.now]
 * @param {boolean} [params.force]
 * @param {boolean} [params.includePrereleases]
 */
export function resolveUpdateCandidates({
  installedVersion,
  versions,
  time = {},
  now = new Date(),
  force = false,
  includePrereleases = false,
}) {
  const referenceTime = typeof now === 'number' ? now : now.getTime();

  // Filter stable versions (or include prereleases if opted in)
  const candidatePool = versions.filter((v) => {
    if (!includePrereleases && isPrerelease(v)) return false;
    return true;
  });

  const sorted = sortSemver(candidatePool);
  if (!sorted.length) {
    return {
      installed: installedVersion,
      latestPublished: null,
      latestEligible: null,
      targetVersion: null,
      forceRequired: false,
      updateAvailable: false,
      isCurrent: true,
      soakingReleases: [],
      eligibleReleases: [],
      history: [],
    };
  }

  const latestPublished = sorted[sorted.length - 1];
  const history = [];
  let latestEligible = null;

  for (const v of sorted) {
    const pubIso = time[v] ?? null;
    const soak = assessSoakStatus(pubIso, referenceTime);
    history.push({
      version: v,
      ...soak,
    });
    if (soak.isEligible) {
      latestEligible = v;
    }
  }

  const soakingReleases = history.filter((h) => h.isSoaking);
  const eligibleReleases = history.filter((h) => h.isEligible);

  // Determine target version:
  // Without --force: target is latestEligible if latestEligible > installedVersion
  // With --force: target is latestPublished if latestPublished > installedVersion
  let targetVersion = null;
  let forceRequired = false;

  const normalTarget = latestEligible && compareSemver(latestEligible, installedVersion) > 0 ? latestEligible : null;
  const forceTarget = latestPublished && compareSemver(latestPublished, installedVersion) > 0 ? latestPublished : null;

  if (force) {
    targetVersion = forceTarget;
  } else {
    targetVersion = normalTarget;
    // If a newer release exists but is soaking and cannot be installed without --force:
    if (!targetVersion && forceTarget) {
      forceRequired = true;
    }
  }

  const isCurrent = !targetVersion && compareSemver(installedVersion, latestEligible ?? installedVersion) >= 0;
  const updateAvailable = targetVersion !== null;

  return {
    installed: installedVersion,
    latestPublished,
    latestEligible,
    targetVersion,
    forceRequired,
    updateAvailable,
    isCurrent,
    soakingReleases,
    eligibleReleases,
    history,
  };
}

/**
 * Format status output for `neatcode update --check`.
 *
 * @param {ReturnType<typeof resolveUpdateCandidates>} plan
 * @param {object} [options]
 * @param {boolean} [options.installationDrift]
 * @returns {string}
 */
export function formatUpdateStatusHuman(plan, { installationDrift = false } = {}) {
  const lines = ['NeatCode updates', ''];

  lines.push(`Installed         ${plan.installed}`);
  lines.push(`Eligible          ${plan.latestEligible ?? '(none)'}`);
  lines.push(`Latest published  ${plan.latestPublished ?? '(none)'}`);
  lines.push('');

  // Show recent relevant versions (up to 4 versions, sorted latest down)
  const recent = [...plan.history].reverse().slice(0, 4);
  for (const item of recent) {
    const ageStr = item.ageMs !== null ? `published ${formatAge(item.ageMs)}` : 'publication age unknown';
    if (item.isEligible) {
      lines.push(`  ${item.version.padEnd(8)} ✓ eligible    ${ageStr}`);
    } else {
      lines.push(`  ${item.version.padEnd(8)} ◷ soaking     ${ageStr}`);
    }
  }
  lines.push('');

  if (installationDrift) {
    lines.push('Installation drift detected across managed agent locations.');
    lines.push('Run: neatcode update --repair');
    lines.push('');
  }

  if (plan.targetVersion) {
    if (plan.targetVersion === plan.latestEligible) {
      lines.push('Normal update:');
      lines.push(`  ${plan.installed} → ${plan.targetVersion}`);
      lines.push('');
      lines.push('Run:');
      lines.push('  neatcode update');
    } else {
      lines.push('Early update (soaking release):');
      lines.push(`  ${plan.installed} → ${plan.targetVersion}`);
      lines.push('');
      lines.push('Run:');
      lines.push('  neatcode update --force');
    }

    if (!plan.force && plan.latestPublished && plan.latestEligible && compareSemver(plan.latestPublished, plan.latestEligible) > 0) {
      const pubItem = plan.history.find((h) => h.version === plan.latestPublished);
      const age = pubItem?.ageMs != null ? `(${formatAge(pubItem.ageMs)})` : '';
      lines.push('');
      lines.push(`Newer release ${plan.latestPublished} is still inside the 24h soak window ${age}.`);
      lines.push('To install early:');
      lines.push(`  neatcode update --force`);
    }
  } else if (plan.forceRequired) {
    const pubItem = plan.history.find((h) => h.version === plan.latestPublished);
    const age = pubItem?.ageMs != null ? `(${formatAge(pubItem.ageMs)})` : '';
    lines.push(`Installed version ${plan.installed} remains current for normal updates.`);
    lines.push(`NeatCode ${plan.latestPublished} has been published and is in its 24h soak window ${age}.`);
    lines.push('');
    lines.push('To update early:');
    lines.push(`  neatcode update --force`);
  } else {
    lines.push(`NeatCode ${plan.installed} is up to date.`);
  }

  return lines.join('\n') + '\n';
}
