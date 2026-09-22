// Lightweight passive update check.
// Cached (~24h), non-blocking, honors NEATCODE_NO_UPDATE_CHECK=1.
// Emits quiet notifications to stderr only.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getNeatcodeHome } from './sync.mjs';
import { fetchPackageMetadata } from './registry.mjs';
import { resolveUpdateCandidates } from './policy.mjs';
import { compareSemver } from './semver.mjs';

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSIVE_CHECK_TIMEOUT_MS = 1500; // Fast timeout to avoid blocking CLI

export function getCacheFilePath(home = homedir()) {
  return join(getNeatcodeHome(home), 'cache', 'update-check.json');
}

/**
 * Read cached update check if still within TTL.
 *
 * @param {string} cacheFile
 * @param {Date | number} [now]
 * @returns {object | null}
 */
export function readCachedCheck(cacheFile, now = new Date()) {
  try {
    if (!existsSync(cacheFile)) return null;
    const content = JSON.parse(readFileSync(cacheFile, 'utf8'));
    const checkedAt = new Date(content.checkedAt).getTime();
    const currentTime = typeof now === 'number' ? now : now.getTime();
    if (currentTime - checkedAt < CACHE_TTL_MS) {
      return content;
    }
  } catch {
    // Corrupt cache -> treat as expired
  }
  return null;
}

/**
 * Write update check result to cache file.
 *
 * @param {string} cacheFile
 * @param {object} data
 */
export function writeCachedCheck(cacheFile, data, now = new Date()) {
  try {
    mkdirSync(join(cacheFile, '..'), { recursive: true });
    const timestamp = typeof now === 'number' ? new Date(now).toISOString() : (now.toISOString ? now.toISOString() : new Date().toISOString());
    writeFileSync(
      cacheFile,
      JSON.stringify({ ...data, checkedAt: timestamp }, null, 2) + '\n',
      'utf8',
    );
  } catch {
    // Best-effort cache write; ignore file system permission errors
  }
}

/**
 * Format passive notification string for terminal stderr.
 *
 * @param {object} plan
 * @param {string} installedVersion
 * @returns {string | null}
 */
export function formatPassiveNotice(plan, installedVersion) {
  if (!plan) return null;

  if (plan.latestEligible && compareSemver(plan.latestEligible, installedVersion) > 0) {
    return `NeatCode ${plan.latestEligible} is available (installed ${installedVersion}).\nRun: neatcode update\n`;
  }

  if (
    plan.latestPublished &&
    compareSemver(plan.latestPublished, installedVersion) > 0 &&
    plan.soakingReleases?.some((s) => s.version === plan.latestPublished)
  ) {
    return `NeatCode ${plan.latestPublished} has been published and is in its 24h soak window.\nInstalled ${installedVersion} remains current for normal updates.\n`;
  }

  return null;
}

/**
 * Perform non-blocking passive update check.
 *
 * @param {object} options
 * @param {string} options.installedVersion
 * @param {string} [options.home]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {Date | number} [options.now]
 * @param {boolean} [options.emitNotice]
 * @returns {Promise<string | null>}
 */
export async function passiveUpdateCheck({
  installedVersion,
  home = homedir(),
  fetchImpl = globalThis.fetch,
  now = new Date(),
  emitNotice = true,
}) {
  if (process.env.NEATCODE_NO_UPDATE_CHECK === '1' || process.env.NEATCODE_NO_UPDATE_CHECK === 'true') {
    return null;
  }

  const cacheFile = getCacheFilePath(home);
  let plan = readCachedCheck(cacheFile, now);

  if (!plan) {
    try {
      const meta = await fetchPackageMetadata({
        timeoutMs: PASSIVE_CHECK_TIMEOUT_MS,
        fetchImpl,
      });
      plan = resolveUpdateCandidates({
        installedVersion,
        versions: meta.versions,
        time: meta.time,
        now,
      });
      writeCachedCheck(cacheFile, plan);
    } catch {
      // Passive check must never fail the host command
      return null;
    }
  }

  const notice = formatPassiveNotice(plan, installedVersion);
  if (notice && emitNotice) {
    process.stderr.write(`\n${notice}`);
  }
  return notice;
}
