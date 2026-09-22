// NeatCode canonical managed skill synchronization and agent exposure reconciliation.
//
// Invariants:
// 1. One NeatCode distribution -> one canonical skill content -> multiple agent exposure points.
// 2. Platform-appropriate linking (symlink preferred, managed copy fallback).
// 3. Deduplication of agents sharing a common skill location (e.g. .agents/skills).
// 4. Critical safety: NEVER silently overwrite locally modified skills.
//    --force does NOT bypass local modification protection.

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkills } from '../env/skills.mjs';
import { compareSemver } from './semver.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PACKAGE_ROOT = resolve(__dirname, '../..');
export const PACKAGE_SKILL_DIR = join(PACKAGE_ROOT, 'skills', 'neatcode');
export const MANAGED_MANIFEST_FILE = '.neatcode-managed.json';

/**
 * Compute sha256 hash of a buffer or string.
 * @param {Buffer | string} content
 * @returns {string}
 */
export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Recursively list all files in a directory relative to that directory.
 * @param {string} dir
 * @param {string} [base]
 * @returns {string[]}
 */
export function listRelativeFiles(dir, base = '') {
  const current = base ? join(dir, base) : dir;
  if (!existsSync(current)) return [];
  const entries = readdirSync(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listRelativeFiles(dir, rel));
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
  return files.sort();
}

/**
 * Compute a file manifest (relative path -> sha256) for a skill directory.
 * Excludes .neatcode-managed.json.
 * @param {string} dir
 * @returns {Record<string, string>}
 */
export function computeSkillManifest(dir) {
  const files = listRelativeFiles(dir);
  const manifest = {};
  for (const file of files) {
    if (file === MANAGED_MANIFEST_FILE) continue;
    const content = readFileSync(join(dir, file));
    manifest[file] = sha256(content);
  }
  return manifest;
}

/**
 * Get canonical NeatCode home directory.
 * Defaults to ~/.neatcode or process.env.NEATCODE_HOME.
 * @param {string} [home]
 * @returns {string}
 */
export function getNeatcodeHome(home = homedir()) {
  return process.env.NEATCODE_HOME?.trim() || join(home, '.neatcode');
}

/**
 * Get canonical managed skill directory.
 * @param {string} [home]
 * @returns {string}
 */
export function getCanonicalSkillDir(home = homedir()) {
  return join(getNeatcodeHome(home), 'skill');
}

/**
 * Extract version from a SKILL.md file.
 * @param {string} skillMdPath
 * @returns {string | null}
 */
export function readSkillVersion(skillMdPath) {
  try {
    const text = readFileSync(skillMdPath, 'utf8');
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text);
    if (!frontmatter) return null;
    const match = /version:\s*([^\s#]+)/.exec(frontmatter[1]);
    return match ? match[1].replace(/^"|"$/g, '').trim() : null;
  } catch {
    return null;
  }
}

/**
 * Classify an existing installation directory.
 *
 * Statuses:
 * - 'absent'
 * - 'managed-linked'
 * - 'managed-copy'
 * - 'skills-manager-managed'
 * - 'unmanaged-clean'
 * - 'unmanaged-modified'
 * - 'stale'
 * - 'unknown'
 *
 * @param {string} targetDir
 * @param {object} [options]
 * @param {string} [options.distributionVersion]
 * @param {string} [options.canonicalDir]
 * @param {Record<string, string>} [options.canonicalManifest]
 */
export function classifyInstallation(targetDir, {
  distributionVersion,
  canonicalDir = null,
  canonicalManifest = null,
} = {}) {
  let lstat;
  try {
    lstat = lstatSync(targetDir);
  } catch {
    return {
      status: 'absent',
      path: targetDir,
      version: null,
      isClean: true,
      reason: 'directory does not exist',
    };
  }

  // Handle symlink
  if (lstat.isSymbolicLink()) {
    let linkTarget;
    try {
      linkTarget = readlinkSync(targetDir);
    } catch {
      return {
        status: 'unknown',
        path: targetDir,
        version: null,
        isClean: false,
        reason: 'unreadable symlink',
      };
    }

    const resolvedTarget = resolve(dirname(targetDir), linkTarget);
    if (!existsSync(resolvedTarget)) {
      return {
        status: 'unknown',
        path: targetDir,
        linkTarget,
        resolvedTarget,
        version: null,
        isClean: false,
        reason: 'broken symlink pointing to non-existent target',
      };
    }

    const linkedVersion = readSkillVersion(join(resolvedTarget, 'SKILL.md'));
    const isStale = distributionVersion && linkedVersion
      ? compareSemver(linkedVersion, distributionVersion) < 0
      : false;

    return {
      status: isStale ? 'stale' : 'managed-linked',
      path: targetDir,
      linkTarget,
      resolvedTarget,
      version: linkedVersion,
      isClean: true,
      stale: isStale,
      reason: isStale ? `stale managed link (${linkedVersion} < ${distributionVersion})` : 'valid managed link',
    };
  }

  if (!lstat.isDirectory()) {
    return {
      status: 'unknown',
      path: targetDir,
      version: null,
      isClean: false,
      reason: 'target is not a directory or symlink',
    };
  }

  // Check for external skill manager metadata
  if (existsSync(join(targetDir, '.skills-lock.json')) || existsSync(join(targetDir, '.skills-meta'))) {
    const version = readSkillVersion(join(targetDir, 'SKILL.md'));
    return {
      status: 'skills-manager-managed',
      path: targetDir,
      version,
      isClean: true,
      reason: 'managed by external skills manager',
    };
  }

  const manifestPath = join(targetDir, MANAGED_MANIFEST_FILE);
  if (existsSync(manifestPath)) {
    let meta;
    try {
      meta = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      return {
        status: 'unmanaged-modified',
        path: targetDir,
        version: null,
        isClean: false,
        reason: 'corrupted managed metadata file',
      };
    }

    // Verify all recorded files against current contents
    const recordedFiles = meta.files || {};
    const actualManifest = computeSkillManifest(targetDir);

    let isModified = false;
    for (const [f, expectedHash] of Object.entries(recordedFiles)) {
      if (actualManifest[f] !== expectedHash) {
        isModified = true;
        break;
      }
    }

    // Also check if any new files were added
    if (!isModified) {
      for (const f of Object.keys(actualManifest)) {
        if (!recordedFiles[f]) {
          isModified = true;
          break;
        }
      }
    }

    if (isModified) {
      return {
        status: 'unmanaged-modified',
        path: targetDir,
        version: meta.version || readSkillVersion(join(targetDir, 'SKILL.md')),
        isClean: false,
        reason: 'files have been locally modified since installation',
      };
    }

    const version = meta.version || readSkillVersion(join(targetDir, 'SKILL.md'));
    const isStale = distributionVersion && version
      ? compareSemver(version, distributionVersion) < 0
      : false;

    return {
      status: isStale ? 'stale' : 'managed-copy',
      path: targetDir,
      version,
      isClean: true,
      stale: isStale,
      reason: isStale ? `stale managed copy (${version} < ${distributionVersion})` : 'verified managed copy',
    };
  }

  // Unmanaged directory: inspect files
  const skillMd = join(targetDir, 'SKILL.md');
  if (!existsSync(skillMd)) {
    return {
      status: 'unknown',
      path: targetDir,
      version: null,
      isClean: false,
      reason: 'missing SKILL.md',
    };
  }

  const skillVersion = readSkillVersion(skillMd);
  const actualManifest = computeSkillManifest(targetDir);

  // If canonicalManifest provided and matches exactly:
  if (canonicalManifest) {
    let allMatch = true;
    for (const [f, h] of Object.entries(canonicalManifest)) {
      if (actualManifest[f] !== h) {
        allMatch = false;
        break;
      }
    }
    if (allMatch && Object.keys(canonicalManifest).length === Object.keys(actualManifest).length) {
      return {
        status: 'unmanaged-clean',
        path: targetDir,
        version: skillVersion,
        isClean: true,
        reason: 'unmanaged directory exactly matching canonical files',
      };
    }
  }

  return {
    status: 'unmanaged-modified',
    path: targetDir,
    version: skillVersion,
    isClean: false,
    reason: 'unmanaged directory with local or unknown modifications',
  };
}

/**
 * Synchronize the canonical managed skill directory from source.
 * Writes .neatcode-managed.json with hashes.
 *
 * @param {string} sourceDir
 * @param {string} targetCanonicalDir
 * @param {string} version
 * @returns {{ filesCount: number, manifest: Record<string, string> }}
 */
export function syncCanonicalSkill(sourceDir, targetCanonicalDir, version) {
  mkdirSync(targetCanonicalDir, { recursive: true });

  // Copy files from source to targetCanonicalDir
  cpSync(sourceDir, targetCanonicalDir, { recursive: true });

  const manifest = computeSkillManifest(targetCanonicalDir);
  const meta = {
    version,
    managedBy: 'neatcode',
    syncedAt: new Date().toISOString(),
    files: manifest,
  };

  writeFileSync(
    join(targetCanonicalDir, MANAGED_MANIFEST_FILE),
    JSON.stringify(meta, null, 2) + '\n',
    'utf8',
  );

  return {
    filesCount: Object.keys(manifest).length,
    manifest,
  };
}

/**
 * Link or copy the canonical managed skill to an agent exposure point.
 *
 * @param {string} agentSkillsDir
 * @param {string} canonicalDir
 * @param {object} [options]
 * @param {string} [options.distributionVersion]
 * @param {Record<string, string>} [options.canonicalManifest]
 * @param {boolean} [options.preferSymlink]
 * @returns {{ action: string, success: boolean, reason: string }}
 */
export function reconcileExposurePoint(agentSkillsDir, canonicalDir, {
  distributionVersion,
  canonicalManifest,
  preferSymlink = true,
} = {}) {
  const targetDir = join(agentSkillsDir, 'neatcode');
  const classification = classifyInstallation(targetDir, {
    distributionVersion,
    canonicalDir,
    canonicalManifest,
  });

  // Critical safety: never overwrite unmanaged-modified or externally managed
  if (classification.status === 'unmanaged-modified') {
    return {
      action: 'skipped',
      success: false,
      reason: `preserved locally modified skill at ${targetDir}`,
      classification,
    };
  }

  if (classification.status === 'skills-manager-managed') {
    return {
      action: 'skipped',
      success: true,
      reason: `preserved externally managed skill at ${targetDir}`,
      classification,
    };
  }

  // If already managed-linked and points to canonicalDir, verify target
  if (classification.status === 'managed-linked' && !classification.stale) {
    if (classification.resolvedTarget === canonicalDir) {
      return {
        action: 'noop',
        success: true,
        reason: 'already linked and current',
        classification,
      };
    }
  }

  // If already managed-copy and current
  if (classification.status === 'managed-copy' && !classification.stale) {
    return {
      action: 'noop',
      success: true,
      reason: 'already copied and current',
      classification,
    };
  }

  // Ensure parent directory exists
  mkdirSync(agentSkillsDir, { recursive: true });

  // If target exists as clean or stale or broken link, remove it first
  if (classification.status !== 'absent') {
    try {
      rmSync(targetDir, { recursive: true, force: true });
    } catch (error) {
      return {
        action: 'failed',
        success: false,
        reason: `failed to remove existing target before sync: ${error.message}`,
        classification,
      };
    }
  }

  // Attempt symlink
  if (preferSymlink) {
    try {
      symlinkSync(canonicalDir, targetDir, 'dir');
      return {
        action: 'linked',
        success: true,
        reason: `symlinked to ${canonicalDir}`,
      };
    } catch {
      // Fallback to managed copy if symlink fails
    }
  }

  // Managed copy fallback
  try {
    cpSync(canonicalDir, targetDir, { recursive: true });
    return {
      action: 'copied',
      success: true,
      reason: `copied managed skill from ${canonicalDir}`,
    };
  } catch (error) {
    return {
      action: 'failed',
      success: false,
      reason: `failed to copy managed skill: ${error.message}`,
    };
  }
}

/**
 * Reconcile all detected agent exposure points across the environment.
 *
 * @param {object} [options]
 * @param {string} [options.home]
 * @param {string} [options.project]
 * @param {string} [options.sourceSkillDir]
 * @param {string} [options.distributionVersion]
 * @returns {{
 *   canonicalDir: string,
 *   reconciled: Array<{ agent: string, path: string, result: ReturnType<typeof reconcileExposurePoint> }>,
 *   warnings: string[],
 * }}
 */
export function reconcileAllInstallations({
  home = homedir(),
  project = null,
  sourceSkillDir = PACKAGE_SKILL_DIR,
  distributionVersion,
} = {}) {
  const pkgVersion = distributionVersion || JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')).version;
  const canonicalDir = getCanonicalSkillDir(home);

  // 1. Sync canonical managed copy
  const { manifest } = syncCanonicalSkill(sourceSkillDir, canonicalDir, pkgVersion);

  // 2. Discover active skill roots
  const discovered = discoverSkills({ home, project });
  const roots = discovered.roots.filter((r) => r.exists);

  // If universal exists or is configured, include it
  const seenPaths = new Set();
  const reconciled = [];
  const warnings = [];

  for (const root of roots) {
    if (seenPaths.has(root.path)) continue;
    seenPaths.add(root.path);

    const result = reconcileExposurePoint(root.path, canonicalDir, {
      distributionVersion: pkgVersion,
      canonicalManifest: manifest,
    });

    const agentNames = root.usedBy.join(', ');
    reconciled.push({
      agent: agentNames,
      path: root.path,
      result,
    });

    if (!result.success) {
      warnings.push(`[${agentNames}] ${result.reason}`);
    }
  }

  return {
    canonicalDir,
    reconciled,
    warnings,
  };
}
