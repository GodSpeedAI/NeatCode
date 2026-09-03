// Bounded context expansion. A diff alone cannot be judged; the whole repository
// cannot be read. This walks exactly one ring outward from each changed path:
//
//   changed path -> owning package -> local imports -> discoverable callers -> tests
//
// Everything it returns is a *pointer*, never file content. The agent decides
// what to open. That keeps the envelope small and the reading deliberate.

import { readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { classifyPath } from './diff.mjs';
import { trackedFiles } from './git.mjs';
import { owningPackage } from './repo.mjs';

const IMPORT_PATTERNS = [
  /^\s*import\s[\s\S]*?from\s+['"]([^'"]+)['"]/gm,   // ES modules
  /^\s*import\s+['"]([^'"]+)['"]/gm,                  // side-effect import
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/gm,            // CommonJS
  /^\s*from\s+([\w.]+)\s+import\b/gm,                 // Python
  /^\s*use\s+(?:crate|super|self)::([\w:]+)/gm,       // Rust
  /^\s*#include\s+"([^"]+)"/gm,                       // C/C++
  /^\s*(?:import|use)\s+"([^"]+)"/gm,                 // Go / PHP
];

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go', '.rb', '.java',
  '.kt', '.swift', '.cs', '.php', '.ex', '.exs', '.c', '.h', '.cc', '.cpp', '.hpp', '.scala',
]);

function readSafe(root, path, maxBytes = 512 * 1024, cache = null) {
  if (cache?.has(path)) return cache.get(path);
  try {
    const raw = readFileSync(join(root, path), 'utf8');
    const text = raw.length > maxBytes ? raw.slice(0, maxBytes) : raw;
    if (cache) cache.set(path, text);
    return text;
  } catch {
    if (cache) cache.set(path, null);
    return null;
  }
}

/** Local (non-package) import specifiers referenced by a changed file. */
export function localImports(root, path, { limit = 25, tracked, cache } = {}) {
  const text = readSafe(root, path, 512 * 1024, cache);
  if (!text) return [];
  const specifiers = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) specifiers.add(match[1]);
  }
  const trackedSet = tracked instanceof Set ? tracked : new Set(tracked ?? trackedFiles(root));
  const resolved = new Set();
  for (const spec of specifiers) {
    if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
    for (const candidate of candidatePaths(dirname(path), spec)) {
      if (trackedSet.has(candidate)) {
        resolved.add(candidate);
        break;
      }
    }
    if (resolved.size >= limit) break;
  }
  return [...resolved];
}

function candidatePaths(fromDir, spec) {
  const base = join(fromDir, spec).split('\\').join('/');
  const out = [base];
  if (!extname(base)) {
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go']) {
      out.push(`${base}${ext}`, `${base}/index${ext}`, `${base}/mod${ext}`);
    }
  }
  return out;
}

/**
 * Files that mention the changed module by name. A textual approximation of
 * "callers" — cheap, language-agnostic, and honest about being approximate.
 */
export function likelyCallers(root, path, { limit = 15, tracked, cache } = {}) {
  const stem = basename(path, extname(path));
  if (!stem || stem.length < 3 || stem === 'index' || stem === 'mod') return [];
  const needle = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  const candidates = tracked ? (Array.isArray(tracked) ? tracked : [...tracked]) : trackedFiles(root);
  const hits = [];
  for (const candidate of candidates) {
    if (candidate === path) continue;
    if (!SOURCE_EXTENSIONS.has(extname(candidate))) continue;
    if (classifyPath(candidate) === 'generated') continue;
    const text = readSafe(root, candidate, 256 * 1024, cache);
    if (text && needle.test(text)) hits.push(candidate);
    if (hits.length >= limit) break;
  }
  return hits;
}

/** Tests whose path or name suggests they cover this file. */
export function relatedTests(root, path, { limit = 10, tracked } = {}) {
  const stem = basename(path, extname(path));
  const candidates = tracked ? (Array.isArray(tracked) ? tracked : [...tracked]) : trackedFiles(root);
  const out = [];
  for (const candidate of candidates) {
    if (classifyPath(candidate) !== 'test') continue;
    if (candidate.includes(stem) || basename(candidate).includes(stem)) out.push(candidate);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * One expansion ring per changed path. Returns pointers only.
 */
export function expandContext(root, changedPaths, { limit = 40 } = {}) {
  const rings = [];
  const tracked = trackedFiles(root);
  const trackedSet = new Set(tracked);
  const cache = new Map();

  for (const path of changedPaths.slice(0, limit)) {
    if (classifyPath(path) === 'generated') {
      rings.push({ path, generated: true, package: null, imports: [], callers: [], tests: [] });
      continue;
    }
    rings.push({
      path,
      generated: false,
      package: owningPackage(root, path),
      imports: localImports(root, path, { tracked: trackedSet, cache }),
      callers: likelyCallers(root, path, { tracked, cache }),
      tests: relatedTests(root, path, { tracked }),
    });
  }
  return rings;
}
