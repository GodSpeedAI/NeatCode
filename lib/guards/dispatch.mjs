// Guard dispatch: file discovery, language routing, and execution.
//
// One concept, one authority: this module owns which files get scanned and
// which analyzer owns each language. Rule knowledge lives in the per-language
// modules; the result model lives in model.mjs; diff-relative labeling lives
// in diffclass.mjs.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { analyzeJavaScript, JS_LANGUAGE_MATCH } from './javascript.mjs';
import { analyzeGo, GO_EXTENSIONS } from './go.mjs';
import { analyzeRust, RUST_EXTENSIONS } from './rust.mjs';
import { analyzePythonFiles, PYTHON_EXTENSIONS } from './python.mjs';
import { makeFailure, sortFindings, summarizeFindings } from './model.mjs';
import { classifyPath } from '../diff.mjs';
import { trackedFiles } from '../git.mjs';

const EXT_LANGUAGE = new Map();
for (const [language, exts] of Object.entries(JS_LANGUAGE_MATCH)) {
  for (const ext of exts) EXT_LANGUAGE.set(ext, language);
}
for (const ext of GO_EXTENSIONS) EXT_LANGUAGE.set(ext, 'go');
for (const ext of RUST_EXTENSIONS) EXT_LANGUAGE.set(ext, 'rust');
for (const ext of PYTHON_EXTENSIONS) EXT_LANGUAGE.set(ext, 'python');

export const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'go', 'rust'];

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', '.jj',
  'dist', 'build', 'out', 'target', 'vendor',
  '__pycache__', '.venv', 'venv', '.next', '.nuxt', '.turbo', 'coverage',
  '.tox', 'eggs', '.eggs',
]);

function isExcluded(rel, includeVendored) {
  const segments = rel.split('/');
  if (segments.some((s) => EXCLUDED_DIRS.has(s))) return true;
  // Never scan vendored guard reference sources unless explicitly asked:
  // they are other projects' code, not this repository's.
  if (!includeVendored && /(^|\/)guards\/[^/]+\/upstream\//.test(rel)) return true;
  return false;
}

function walkDir(absDir, root, out) {
  for (const entry of readdirSync(absDir)) {
    const abs = join(absDir, entry);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkDir(abs, root, out);
    else if (st.isFile()) out.push(abs);
  }
}

/**
 * Discover scannable files.
 * - paths: explicit files/dirs (relative to root). Default: tracked files in
 *   a git repo, otherwise a full recursive walk.
 */
export function collectGuardFiles(
  root,
  { paths = null, languages = null, includeGenerated = false, includeVendored = false } = {},
) {
  const wanted = languages ? new Set(languages) : null;
  let candidates = [];
  if (paths && paths.length) {
    for (const p of paths) {
      const abs = resolve(root, p);
      if (!existsSync(abs)) continue;
      const st = statSync(abs);
      if (st.isDirectory()) {
        const found = [];
        walkDir(abs, root, found);
        candidates.push(...found);
      } else if (st.isFile()) {
        candidates.push(abs);
      }
    }
  } else {
    try {
      candidates = trackedFiles(root).map((p) => join(root, p));
    } catch {
      try {
        const found = [];
        walkDir(root, root, found);
        candidates = found;
      } catch {
        candidates = []; // unreadable root: empty scope, not a crash
      }
    }
  }

  const files = [];
  for (const abs of candidates) {
    const rel = relative(root, abs);
    if (!rel || rel.startsWith('..')) continue;
    const language = EXT_LANGUAGE.get(extname(rel).toLowerCase());
    if (!language) continue;
    if (wanted && !wanted.has(language)) continue;
    if (isExcluded(rel, includeVendored)) continue;
    if (!includeGenerated && classifyPath(rel) === 'generated') continue;
    files.push({ abs, rel, language });
  }
  files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return files;
}

/** Read one file; a read failure is an execution failure, not a clean file. */
function readGuardFile(abs, rel, language) {
  try {
    return { source: readFileSync(abs, 'utf8'), failure: null };
  } catch (error) {
    return {
      source: null,
      failure: makeFailure({ language, path: rel, reason: 'file-unreadable', detail: error.message }),
    };
  }
}

export function analyzeCollected(root, files, { pythonBin = 'python3' } = {}) {
  const findings = [];
  const failures = [];
  const perLanguage = new Map();

  const note = (language, rel, status) => {
    const entry = perLanguage.get(language) ?? { language, files: 0, status: 'runnable' };
    entry.files += 1;
    if (status === 'failed') entry.status = 'failed';
    perLanguage.set(language, entry);
  };

  const native = files.filter((f) => f.language !== 'python');
  for (const { abs, rel, language } of native) {
    note(language, rel);
    const { source, failure } = readGuardFile(abs, rel, language);
    if (failure) {
      failures.push(failure);
      note(language, rel, 'failed');
      continue;
    }
    try {
      const result =
        language === 'go'
          ? analyzeGo({ path: rel, source })
          : language === 'rust'
            ? analyzeRust({ path: rel, source })
            : analyzeJavaScript({ path: rel, source, language });
      findings.push(...result.findings);
      failures.push(...result.failures);
      if (result.failures.length) note(language, rel, 'failed');
    } catch (error) {
      failures.push(
        makeFailure({ language, path: rel, reason: 'analyzer-crashed', detail: error.message }),
      );
      note(language, rel, 'failed');
    }
  }

  const pyFiles = files.filter((f) => f.language === 'python');
  if (pyFiles.length) {
    const absPaths = [];
    for (const { abs, rel } of pyFiles) {
      note('python', rel);
      const { source, failure } = readGuardFile(abs, rel, 'python');
      if (failure) {
        failures.push(failure);
        note('python', rel, 'failed');
      } else {
        absPaths.push(abs);
      }
    }
    if (absPaths.length) {
      const result = analyzePythonFiles({ root, absPaths, pythonBin });
      findings.push(...result.findings);
      failures.push(...result.failures);
      if (result.failures.length) {
        const entry = perLanguage.get('python');
        if (entry) entry.status = 'failed';
      }
      if (result.version) {
        const entry = perLanguage.get('python');
        if (entry) entry.engine = `anti_slop (python ${result.version})`;
      }
    }
  }

  return {
    findings: sortFindings(findings),
    failures,
    summary: summarizeFindings(sortFindings(findings)),
    languages: [...perLanguage.values()].sort((a, b) => (a.language < b.language ? -1 : 1)),
  };
}
