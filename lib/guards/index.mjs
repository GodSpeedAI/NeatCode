// Guard orchestration: the public entry the CLI and the envelope call.
//
// runGuards() scans files, optionally against a git baseline so findings can
// be labeled introduced / worsened / exposed / pre-existing / resolved. The
// output never claims a clean result when a parser or runner failed:
// `clean` is false whenever failures exist, and execution problems are
// carried in `failures`, never silently dropped.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { analyzeCollected, collectGuardFiles, SUPPORTED_LANGUAGES } from './dispatch.mjs';
import { classifyFindings, countByRuleAndPath } from './diffclass.mjs';
import { formatFinding, validateFinding } from './model.mjs';
import { analyzeJavaScript } from './javascript.mjs';
import { analyzeGo } from './go.mjs';
import { analyzeRust } from './rust.mjs';
import { analyzePythonFiles } from './python.mjs';
import { acquireDiff, isGitRepo, showFile } from '../git.mjs';

export { SUPPORTED_LANGUAGES };

function addedLinesByPath(diffText) {
  // Precise added-line mapping: walk the diff tracking new-file line numbers
  // and record only `+` lines. Hunk ranges would include context lines and
  // mislabel nearby pre-existing findings as introduced.
  const map = new Map();
  const files = [];
  if (!diffText || !diffText.trim()) return { map, files };
  let path = null;
  let added = null;
  let newLine = 0;
  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      if (path !== null) {
        map.set(path, added);
        files.push({ path });
      }
      // Same anchoring as lib/diff.mjs: paths may contain spaces.
      const rest = raw.slice('diff --git '.length);
      const pivot = rest.lastIndexOf(' b/');
      let next = pivot === -1 ? null : rest.slice(pivot + 3);
      if (next?.startsWith('"') && next.endsWith('"')) {
        next = next.slice(1, -1).replace(/\\(["\\])/g, '$1');
      }
      path = next?.replace(/^b\//, '') ?? null;
      if (path?.startsWith('a/') && pivot === -1) path = path.slice(2);
      added = new Set();
      newLine = 0;
      continue;
    }
    if (path === null) continue;
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      added.add(newLine);
      newLine += 1;
    } else if (raw.startsWith('-') && !raw.startsWith('---')) {
      // Deletion: new-file line number does not advance.
    } else if (raw.startsWith(' ') || raw === '') {
      newLine += 1;
    } else if (raw.startsWith('\\')) {
      // "\ No newline at end of file" — no line movement.
    }
  }
  if (path !== null) {
    map.set(path, added);
    files.push({ path });
  }
  return { map, files };
}

/** Run one language analyzer over in-memory source (used for baselines). */
function analyzeSource(language, path, source) {
  if (language === 'python') return { findings: [], failures: [] }; // baselines for python run through the engine only on files; handled below
  if (language === 'go') return analyzeGo({ path, source });
  if (language === 'rust') return analyzeRust({ path, source });
  return analyzeJavaScript({ path, source, language });
}

function languageOfPath(path) {
  if (/\.m?[jt]sx?$/.test(path) || /\.c[m]?js$/.test(path) || /\.jsx$/.test(path)) {
    return /\.tsx?$/.test(path) || /\.m?cts$/.test(path) ? 'typescript' : 'javascript';
  }
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.rs')) return 'rust';
  return null;
}

/**
 * @param {object} options
 * @param {string} options.root repository root / scan root
 * @param {string[]} [options.paths] files or dirs to scan (default: auto)
 * @param {string[]} [options.languages] subset of SUPPORTED_LANGUAGES
 * @param {boolean} [options.includeGenerated]
 * @param {string|null} [options.baseline] git rev for the before-image (enables provenance)
 * @param {string|null} [options.diff] unified diff text for added-line mapping
 * @param {object} [options.diffSource] {mode, paths} to acquire the diff with
 */
export function runGuards({
  root,
  paths = null,
  languages = null,
  includeGenerated = false,
  baseline = null,
  diff = null,
  diffSource = null,
  pythonBin = 'python3',
} = {}) {
  if (languages) {
    for (const l of languages) {
      if (!SUPPORTED_LANGUAGES.includes(l)) throw new Error(`neatcode guard: unknown language "${l}"`);
    }
  }

  const files = collectGuardFiles(root, { paths, languages, includeGenerated });
  const current = analyzeCollected(root, files, { pythonBin });

  let provenance = null;
  let resolved = [];
  if (baseline || diff || diffSource) {
    let diffText = diff;
    if (!diffText && diffSource && isGitRepo(root)) {
      try {
        diffText = acquireDiff(diffSource, { cwd: root }).diff;
      } catch {
        diffText = '';
      }
    }
    const { map: added, files: diffFiles } = addedLinesByPath(diffText ?? '');
    const touched = new Set(diffFiles.map((f) => f.path));

    // Baseline findings: run the same analyzers over HEAD content.
    const baseFindings = [];
    const baseFailures = [];
    if (baseline && isGitRepo(root)) {
      const basePaths = new Set([...touched, ...files.map((f) => f.rel)]);
      const pyBaseline = [];
      for (const rel of basePaths) {
        const language = languageOfPath(rel);
        if (!language) continue;
        if (languages && !languages.includes(language)) continue;
        const content = showFile(baseline, rel, root);
        if (content == null) continue;
        if (language === 'python') {
          pyBaseline.push({ rel, content });
          continue;
        }
        try {
          const r = analyzeSource(language, rel, content);
          baseFindings.push(...r.findings);
          baseFailures.push(...r.failures);
        } catch (error) {
          baseFailures.push({ language, path: rel, reason: 'baseline-failed', detail: error.message });
        }
      }
      // Python baselines run through the same vendored engine: HEAD contents
      // are mirrored into a temp tree (same relative layout, so reported
      // paths map back directly) and scanned in one engine invocation.
      if (pyBaseline.length) {
        const mirror = mkdtempSync(join(tmpdir(), 'neatcode-guardbase-'));
        try {
          const absPaths = [];
          for (const { rel, content } of pyBaseline) {
            const abs = join(mirror, rel);
            mkdirSync(dirname(abs), { recursive: true });
            writeFileSync(abs, content);
            absPaths.push(abs);
          }
          const r = analyzePythonFiles({ root: mirror, absPaths, pythonBin });
          baseFindings.push(...r.findings);
          baseFailures.push(...r.failures);
        } catch (error) {
          baseFailures.push({ language: 'python', path: null, reason: 'baseline-failed', detail: error.message });
        } finally {
          rmSync(mirror, { recursive: true, force: true });
        }
      }
    }

    const classified = classifyFindings({
      findings: current.findings,
      baselineCounts: countByRuleAndPath(baseFindings),
      addedLines: added,
      touchedFiles: touched,
    });
    provenance = classified.counts;
    resolved = classified.resolved;
    return {
      ran: true,
      root,
      baseline: baseline ?? null,
      languages: current.languages,
      files: files.length,
      findings: classified.classified,
      resolved,
      failures: [...current.failures, ...baseFailures],
      summary: current.summary,
      provenance,
      clean: classified.classified.length === 0 && current.failures.length === 0,
    };
  }

  return {
    ran: true,
    root,
    baseline: null,
    languages: current.languages,
    files: files.length,
    findings: current.findings,
    resolved: [],
    failures: current.failures,
    summary: current.summary,
    provenance: null,
    clean: current.findings.length === 0 && current.failures.length === 0,
  };
}

export function validateGuardResult(result) {
  const problems = [];
  if (result?.ran !== true) problems.push('guards.ran must be true');
  if (!Array.isArray(result?.findings)) problems.push('guards.findings must be an array');
  else {
    result.findings.forEach((f, i) => {
      for (const p of validateFinding(f)) problems.push(`guards.findings[${i}]: ${p}`);
    });
  }
  if (!Array.isArray(result?.failures)) problems.push('guards.failures must be an array');
  if (result?.clean === true && (result.findings.length || result.failures.length)) {
    problems.push('guards.clean must be false when findings or failures exist');
  }
  return problems;
}

/** Human rendering for `neatcode guard` (default output). */
export function formatGuardsHuman(result) {
  const out = [];
  out.push('NeatCode Guards');
  out.push('');
  if (!result.languages.length) {
    out.push('No supported guard files found in scope.');
  } else {
    for (const l of result.languages) {
      const mark = l.status === 'failed' ? '!' : '✓';
      const engine = l.engine ? ` (${l.engine})` : '';
      out.push(`  ${mark} ${l.language} · ${l.files} file(s)${engine}`);
    }
  }
  out.push('');
  if (result.failures.length) {
    out.push('Execution failures (not clean — these files were not fully checked):');
    for (const f of result.failures) {
      out.push(`  ! ${f.path ?? '(global)'} [${f.language}] ${f.reason}${f.detail ? ` — ${f.detail}` : ''}`);
    }
    out.push('');
  }
  if (!result.findings.length && !result.failures.length) {
    out.push('Clean: no deterministic findings.');
  } else if (result.findings.length) {
    if (result.provenance) {
      const p = result.provenance;
      out.push(
        `Findings: ${result.findings.length} ` +
          `(introduced ${p.introduced} · worsened ${p.worsened} · exposed ${p.exposed} · ` +
          `pre-existing ${p.preExisting} · resolved ${p.resolved})`,
      );
    } else {
      out.push(`Findings: ${result.findings.length}`);
    }
    for (const f of result.findings) {
      const prov = f.provenance ? ` · ${f.provenance}` : '';
      out.push(`  - ${formatFinding(f)}${prov}`);
    }
    if (result.resolved.length) {
      out.push('');
      out.push(`Resolved since baseline: ${result.resolved.length}`);
      for (const r of result.resolved) out.push(`  - ${r.path} [${r.rule_id}] (was ${r.baseline_count})`);
    }
  }
  return `${out.join('\n')}\n`;
}
