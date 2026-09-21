// Developer toolchain discovery: what can this machine actually run.
//
// Bounded on purpose: the languages NeatCode guards and verifies (Node,
// Python, Rust, Go), the VCS it reads (git), the container runtime it may
// invoke (docker), the package runners repositories declare, and the guard
// engines themselves. This is not a general system inventory — every entry
// answers "can NeatCode implement or verify here?".

import { findOnPath, probeVersion } from './detect.mjs';
import { probePython } from '../guards/python.mjs';
import { discoverChecks } from '../verify.mjs';

const TOOL_SPECS = [
  { name: 'node', exes: ['node'], versionArgs: ['--version'] },
  { name: 'npm', exes: ['npm'], versionArgs: ['--version'] },
  { name: 'pnpm', exes: ['pnpm'], versionArgs: ['--version'] },
  { name: 'yarn', exes: ['yarn'], versionArgs: ['--version'] },
  { name: 'bun', exes: ['bun'], versionArgs: ['--version'] },
  { name: 'python', exes: ['python3', 'python'], versionArgs: ['--version'] },
  { name: 'uv', exes: ['uv'], versionArgs: ['--version'] },
  { name: 'pip', exes: ['pip3', 'pip'], versionArgs: ['--version'] },
  { name: 'rust', exes: ['cargo'], versionArgs: ['--version'], extra: ['rustc'] },
  { name: 'go', exes: ['go'], versionArgs: ['version'] },
  { name: 'git', exes: ['git'], versionArgs: ['--version'] },
  { name: 'docker', exes: ['docker'], versionArgs: ['--version'] },
];

/**
 * @param {object} options { project, runVersion (bool, default true) }
 * Version probing executes `<exe> <args>` over argv — read-only, no state.
 */
export function discoverTools({ project = null, runVersion = true } = {}) {
  const tools = TOOL_SPECS.map((spec) => {
    let path = null;
    let exe = null;
    for (const candidate of spec.exes) {
      const found = findOnPath(candidate);
      if (found) {
        path = found;
        exe = candidate;
        break;
      }
    }
    const entry = { name: spec.name, found: path !== null, path, version: null };
    if (path && runVersion) entry.version = probeVersion(path, spec.versionArgs);
    if (spec.extra && path) {
      entry.extra = {};
      for (const extraExe of spec.extra) {
        const extraPath = findOnPath(extraExe);
        entry.extra[extraExe] = extraPath
          ? { found: true, path: extraPath, version: runVersion ? probeVersion(extraPath, ['--version']) : null }
          : { found: false, path: null, version: null };
      }
    }
    return entry;
  });

  // Guard engines: can the deterministic guards actually execute here?
  const python = probePython('python3');
  const engines = {
    'neatcode/js-ts': { runnable: true, detail: 'dependency-free, runs on node' },
    'neatcode/go': { runnable: true, detail: 'dependency-free, runs on node' },
    'neatcode/rust': { runnable: true, detail: 'dependency-free, runs on node' },
    'anti_slop/python': python
      ? { runnable: python.supported, detail: `system python3 ${python.version}${python.supported ? '' : ' (< 3.12, unsupported)'}` }
      : { runnable: false, detail: 'python3 not found on PATH' },
  };

  let declared = [];
  if (project) {
    try {
      declared = discoverChecks(project);
    } catch {
      declared = [];
    }
  }

  return { tools, engines, declared };
}
