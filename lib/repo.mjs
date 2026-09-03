// Repository morphology: the observable phenotype the skill reads architecture
// out of. Tree shape, package boundaries, manifests, instruction files and
// architecture claims — collected bounded, never dumped wholesale.

import { existsSync, statSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { classifyPath } from './diff.mjs';
import { trackedFiles } from './git.mjs';

const MANIFESTS = [
  'package.json', 'deno.json', 'deno.jsonc', 'jsr.json',
  'Cargo.toml', 'go.mod', 'pyproject.toml', 'setup.py', 'requirements.txt',
  'Gemfile', 'composer.json', 'pom.xml', 'build.gradle', 'build.gradle.kts',
  'mix.exs', 'pubspec.yaml', 'Package.swift', 'CMakeLists.txt',
];

const INSTRUCTION_FILES = [
  'AGENTS.md', 'agents.md', 'CLAUDE.md', 'claude.md', 'CONVENTIONS.md', 'conventions.md',
  'CONTRIBUTING.md', 'contributing.md', 'CONTRIBUTING.rst', 'contributing.rst',
  '.cursorrules', '.windsurfrules', 'GEMINI.md', 'gemini.md', 'engineering.md', 'ENGINEERING.md',
];

const ARCHITECTURE_FILES = [
  'ARCHITECTURE.md', 'architecture.md', 'ARCHITECTURE.rst', 'architecture.rst',
  'DESIGN.md', 'design.md', 'README.md', 'readme.md', 'README.rst', 'readme.rst',
  'engineering.md', 'ENGINEERING.md',
];

const ARCHITECTURE_DIRS = ['docs/architecture', 'docs/adr', 'docs/adrs', 'docs/decisions', 'adr', 'rfcs', 'docs/rfcs'];

const WORKSPACE_MARKERS = ['pnpm-workspace.yaml', 'lerna.json', 'nx.json', 'turbo.json', 'go.work', 'Cargo.toml'];

/** Every tracked path, grouped into the classes the phenotype protocol needs. */
export function readTree(root, { maxDepth = 3, maxDirs = 200 } = {}) {
  const files = trackedFiles(root);
  const dirs = new Map();
  const counts = { source: 0, test: 0, docs: 0, config: 0, generated: 0 };

  for (const path of files) {
    const kind = classifyPath(path);
    counts[kind] = (counts[kind] ?? 0) + 1;
    const segments = path.split('/').slice(0, -1);
    const key = segments.slice(0, maxDepth).join('/') || '.';
    const entry = dirs.get(key) ?? { path: key, files: 0, kinds: {} };
    entry.files += 1;
    entry.kinds[kind] = (entry.kinds[kind] ?? 0) + 1;
    dirs.set(key, entry);
  }

  const directories = [...dirs.values()]
    .sort((a, b) => b.files - a.files || a.path.localeCompare(b.path))
    .slice(0, maxDirs);

  return { fileCount: files.length, counts, directories, topLevel: topLevelDirs(files) };
}

function topLevelDirs(files) {
  const top = new Map();
  for (const path of files) {
    const head = path.includes('/') ? path.slice(0, path.indexOf('/')) : '(root files)';
    top.set(head, (top.get(head) ?? 0) + 1);
  }
  return [...top.entries()]
    .map(([path, files]) => ({ path, files }))
    .sort((a, b) => b.files - a.files);
}

/** Files whose size is a taxonomy signal (god modules, one-line-per-file sprawl). */
export function sizeOutliers(root, { limit = 12 } = {}) {
  const rows = [];
  for (const path of trackedFiles(root)) {
    if (classifyPath(path) === 'generated') continue;
    const abs = join(root, path);
    try {
      const st = statSync(abs);
      if (st.isFile()) rows.push({ path, bytes: st.size });
    } catch {
      // Tracked but absent from the working tree — deleted, sparse, or a submodule.
    }
  }
  rows.sort((a, b) => b.bytes - a.bytes);
  return rows.slice(0, limit);
}

function findAll(root, names) {
  const tracked = new Set(trackedFiles(root));
  const found = [];
  for (const name of names) {
    if (tracked.has(name) || existsSync(join(root, name))) found.push(name);
  }
  return found;
}

/** Manifests anywhere in the tree — this is how workspace packages surface. */
export function findManifests(root, { limit = 40 } = {}) {
  const set = new Set(MANIFESTS);
  return trackedFiles(root)
    .filter((p) => set.has(p.split('/').pop()))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
    .slice(0, limit);
}

export function findInstructions(root) {
  const names = new Set(INSTRUCTION_FILES);
  const nested = trackedFiles(root).filter(
    (p) => names.has(p.split('/').pop()) && p.includes('/'),
  );
  return [...findAll(root, INSTRUCTION_FILES), ...nested.slice(0, 20)];
}

export function findArchitectureDocs(root) {
  const rootDocs = findAll(root, ARCHITECTURE_FILES);
  const dirDocs = trackedFiles(root).filter((p) =>
    ARCHITECTURE_DIRS.some((d) => p.startsWith(`${d}/`)),
  );
  return [...rootDocs, ...dirDocs.slice(0, 40)];
}

export function detectWorkspace(root) {
  const markers = findAll(root, WORKSPACE_MARKERS);
  const manifests = findManifests(root);
  const nested = manifests.filter((m) => m.includes('/'));
  return {
    markers,
    packageCount: nested.length + (manifests.some((m) => !m.includes('/')) ? 1 : 0),
    monorepo: nested.length > 1,
  };
}

/** Nearest enclosing manifest — the package a changed file actually belongs to. */
export function owningPackage(root, filePath) {
  const manifestNames = new Set(MANIFESTS);
  let dir = dirname(filePath).split('\\').join('/');
  while (true) {
    for (const name of manifestNames) {
      const candidate = dir === '.' ? name : `${dir}/${name}`;
      if (existsSync(join(root, candidate))) return { dir, manifest: candidate };
    }
    if (dir === '.' || dir === '' || dir === sep || dir === '/') return null;
    const next = dirname(dir).split('\\').join('/');
    if (next === dir) return null;
    dir = next;
  }
}

export function collectRepository(root, options = {}) {
  return {
    root,
    tree: readTree(root, options),
    manifests: findManifests(root),
    instructions: findInstructions(root),
    architectureDocs: findArchitectureDocs(root),
    workspace: detectWorkspace(root),
    sizeOutliers: sizeOutliers(root, options),
  };
}
