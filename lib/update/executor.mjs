// Self-update execution and staged finalization.
//
// Invariants:
// 1. The process initiating an update is the old executable.
// 2. The newly installed NeatCode binary finalizes the installation,
//    ensuring fresh loaded modules synchronize skills and verify coherence.
// 3. Argv-based process execution (no unsafe shell interpolation).
// 4. Update failure semantics: never report success on partial completion.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findOnPath } from '../env/detect.mjs';
import { reconcileAllInstallations } from './sync.mjs';
import { runDoctor } from './doctor.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '../..');

/**
 * Detect how current NeatCode process was installed.
 *
 * @param {string} [pkgRoot]
 * @returns {'git-development' | 'global-npm' | 'local-npm'}
 */
export function detectInstallMode(pkgRoot = PACKAGE_ROOT) {
  if (existsSync(join(pkgRoot, '.git'))) {
    return 'git-development';
  }
  return 'global-npm';
}

/**
 * Execute finalization in the newly installed distribution.
 *
 * @param {object} options
 * @param {string} options.targetVersion
 * @param {string} [options.home]
 * @param {string} [options.project]
 * @returns {{ success: boolean, version: string, warnings: string[], errors: string[] }}
 */
export async function finalizeUpdate({
  targetVersion,
  home = homedir(),
  project = null,
}) {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  const currentVersion = pkg.version;
  const errors = [];
  const warnings = [];

  // Verify target version matches this running distribution
  if (targetVersion && currentVersion !== targetVersion) {
    errors.push(`Finalizer version mismatch: expected ${targetVersion}, but running binary is ${currentVersion}`);
    return { success: false, version: currentVersion, warnings, errors };
  }

  // Synchronize canonical skill and reconcile all agent exposure points
  const syncResult = reconcileAllInstallations({
    home,
    project,
    distributionVersion: currentVersion,
  });

  for (const w of syncResult.warnings) {
    warnings.push(w);
  }

  // Verify coherence using doctor
  const doc = await runDoctor({ home, project, checkRemote: false });
  if (!doc.distribution.coherent) {
    for (const issue of doc.issues) errors.push(issue);
  }

  const success = errors.length === 0;
  return {
    success,
    version: currentVersion,
    warnings,
    errors,
  };
}

/**
 * Perform staged self-update.
 *
 * @param {object} options
 * @param {string} options.targetVersion
 * @param {string} [options.home]
 * @param {string} [options.project]
 * @param {Function} [options.spawnImpl]
 * @returns {Promise<{ success: boolean, message: string, partial?: boolean }>}
 */
export async function executeUpdate({
  targetVersion,
  home = homedir(),
  project = null,
  spawnImpl = spawnSync,
}) {
  const mode = detectInstallMode();
  if (mode === 'git-development') {
    return {
      success: false,
      message: 'Running from a local Git development repository. Self-update does not overwrite development checkouts. Use git pull or git checkout to update code, or neatcode update --repair to reconcile installed agent skills.',
    };
  }

  // 1. Install target package using npm
  const npmPath = findOnPath('npm') || 'npm';
  const installArgs = ['install', '-g', `@godspeedai/neatcode@${targetVersion}`];

  const installRun = spawnImpl(npmPath, installArgs, {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  if (installRun.error || installRun.status !== 0) {
    return {
      success: false,
      message: `Package installation failed (npm exited with code ${installRun.status ?? 1})`,
    };
  }

  // 2. Find newly installed neatcode executable
  const neatcodeExe = findOnPath('neatcode');
  if (!neatcodeExe) {
    return {
      success: false,
      partial: true,
      message: 'Package was installed, but "neatcode" binary could not be found on PATH to finalize the update. Run: neatcode update --repair',
    };
  }

  // 3. Invoke newly installed binary for staged finalization
  const finalizeRun = spawnImpl(neatcodeExe, ['_update-finalize', '--target-version', targetVersion], {
    stdio: 'inherit',
    encoding: 'utf8',
  });

  if (finalizeRun.error || finalizeRun.status !== 0) {
    return {
      success: false,
      partial: true,
      message: `Update finalization failed with exit code ${finalizeRun.status ?? 1}. Run: neatcode update --repair to recover.`,
    };
  }

  return {
    success: true,
    message: `NeatCode successfully updated to ${targetVersion} and all managed skills reconciled.`,
  };
}
