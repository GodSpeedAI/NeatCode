// The change envelope: the object NeatCode reasons over.
//
//   requested intent + change set + changed-file context + repository
//   instructions + declared architecture + observed morphology + dependencies
//   and callers + verification evidence
//
// Assembly, deterministic validation, and serialization live here. Judgment does
// not — that belongs to the skill.

import { readFileSync } from 'node:fs';
import { acquireDiff, currentBranch, headRev, repoRoot, workingTreeStatus } from './git.mjs';
import { parseDiff, summarizeChange } from './diff.mjs';
import { collectRepository } from './repo.mjs';
import { expandContext } from './context.mjs';
import { discoverChecks, runChecks } from './verify.mjs';
import { runGuards } from './guards/index.mjs';

export const ENVELOPE_VERSION = 1;

export const SCOPE_MODES = new Set([
  'working-tree', 'staged', 'commit', 'range', 'patch', 'paths', 'repository',
]);

const DEFAULT_MAX_DIFF_BYTES = 400_000;

/**
 * @param {object} options
 * @param {string} [options.cwd]
 * @param {string} [options.verb] review | audit | restructure | study | harden | build
 * @param {object} options.source { mode, rev, range, patch, paths }
 * @param {string[]} [options.verify] commands to execute and record
 * @param {string} [options.intent] the requested outcome, in the user's words
 * @param {boolean} [options.guards] include deterministic guard evidence for changed paths
 */
export function buildEnvelope(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const root = repoRoot(cwd);
  const source = options.source ?? { mode: 'working-tree' };
  const maxDiffBytes = options.maxDiffBytes ?? DEFAULT_MAX_DIFF_BYTES;

  let change = { mode: source.mode, base: null, head: null, diff: '', describe: source.mode };
  if (source.mode === 'patch') {
    const diff = readFileSync(source.patch, 'utf8');
    change = { mode: 'patch', base: null, head: null, diff, describe: `patch file ${source.patch}` };
  } else if (source.mode === 'diff-text') {
    change = { mode: 'patch', base: null, head: null, diff: source.diff ?? '', describe: 'supplied unified diff' };
  } else if (source.mode === 'paths' || source.mode === 'repository') {
    change = {
      mode: source.mode,
      base: headRev(root),
      head: null,
      diff: '',
      describe: source.mode === 'repository' ? 'whole repository' : `paths: ${(source.paths ?? []).join(', ')}`,
    };
  } else {
    change = acquireDiff(source, { cwd: root });
  }

  const parsed = parseDiff(change.diff);
  const truncated = change.diff.length > maxDiffBytes;
  const changedPaths = parsed.files.map((f) => f.path).filter(Boolean);
  const contextPaths = changedPaths.length ? changedPaths : (source.paths ?? []);

  const repository = collectRepository(root);
  const dirty = workingTreeStatus(root);
  const verifyCommands = options.verify ?? [];

  // Deterministic guard evidence is opt-in: scanning costs time, and most
  // envelope consumers do not need it. When requested, guards run over the
  // changed paths with a HEAD baseline for diff-bearing scopes so findings
  // carry introduced/worsened/exposed/pre-existing/resolved provenance.
  let guards = { ran: false, findings: [], failures: [] };
  if (options.guards) {
    const diffScope = ['working-tree', 'staged', 'commit', 'range', 'patch'].includes(source.mode);
    try {
      const full = runGuards({
        root,
        paths: contextPaths.length ? contextPaths : null,
        baseline: diffScope ? 'HEAD' : null,
        diff: diffScope ? change.diff : null,
      });
      guards = {
        ran: true,
        languages: full.languages.map((l) => l.language),
        findings: full.findings,
        resolved: full.resolved,
        failures: full.failures,
        summary: full.summary,
        provenance: full.provenance,
        clean: full.clean,
      };
    } catch (error) {
      guards = { ran: false, findings: [], failures: [{ language: 'all', path: null, reason: 'guard-run-failed', detail: error.message }] };
    }
  }

  return {
    neatcode: { envelope: ENVELOPE_VERSION, generated: new Date().toISOString() },
    scope: {
      verb: options.verb ?? 'review',
      mode: change.mode,
      describe: change.describe,
      base: change.base,
      head: change.head,
      paths: source.paths ?? [],
    },
    intent: options.intent ?? null,
    change: {
      summary: summarizeChange(parsed),
      files: parsed.files.map((f) => ({
        path: f.path,
        oldPath: f.oldPath,
        status: f.status,
        kind: f.kind,
        binary: f.binary,
        additions: f.additions,
        deletions: f.deletions,
        hunks: f.hunks.map((h) => ({ oldStart: h.oldStart, oldLines: h.oldLines, newStart: h.newStart, newLines: h.newLines, section: h.section })),
      })),
      diff: truncated ? change.diff.slice(0, maxDiffBytes) : change.diff,
      diffTruncated: truncated,
      diffBytes: change.diff.length,
    },
    repository: {
      root,
      branch: currentBranch(root),
      head: headRev(root),
      cleanWorkingTree: dirty.length === 0,
      dirtyPaths: dirty.slice(0, 50).map((d) => d.path),
      tree: repository.tree,
      manifests: repository.manifests,
      instructions: repository.instructions,
      architectureDocs: repository.architectureDocs,
      workspace: repository.workspace,
      sizeOutliers: repository.sizeOutliers,
    },
    context: expandContext(root, contextPaths),
    verification: {
      declared: discoverChecks(root),
      ran: verifyCommands.length ? runChecks(verifyCommands, { cwd: root }) : [],
    },
    guards,
  };
}

/**
 * Deterministic structural checks. Returns [] when the envelope is well formed.
 * This is the one place NeatCode asserts anything on its own output.
 */
export function validateEnvelope(envelope) {
  const problems = [];
  const fail = (message) => problems.push(message);

  if (envelope?.neatcode?.envelope !== ENVELOPE_VERSION) {
    fail(`envelope version must be ${ENVELOPE_VERSION}`);
  }
  if (!SCOPE_MODES.has(envelope?.scope?.mode)) {
    fail(`unknown scope mode: ${envelope?.scope?.mode}`);
  }
  if (typeof envelope?.repository?.root !== 'string' || !envelope.repository.root) {
    fail('repository.root is required');
  }
  if (!Array.isArray(envelope?.change?.files)) {
    fail('change.files must be an array');
  } else {
    for (const [i, file] of envelope.change.files.entries()) {
      if (!file.path) fail(`change.files[${i}] has no path`);
      if (!['added', 'modified', 'deleted', 'renamed', 'copied'].includes(file.status)) {
        fail(`change.files[${i}] has unknown status: ${file.status}`);
      }
    }
    // A diff-bearing scope that parsed to nothing means acquisition silently failed.
    const diffScope = ['working-tree', 'staged', 'commit', 'range', 'patch'].includes(envelope?.scope?.mode);
    if (diffScope && envelope.change.diff?.trim() && envelope.change.files.length === 0) {
      fail('diff text is present but no files parsed out of it');
    }
  }
  if (envelope?.change?.diffTruncated && !envelope.change.diffBytes) {
    fail('truncated diff must record diffBytes');
  }
  for (const [i, check] of (envelope?.verification?.ran ?? []).entries()) {
    if (typeof check.ran !== 'boolean') fail(`verification.ran[${i}] must record whether it ran`);
    if (!['passed', 'failed', 'timeout', 'not-run'].includes(check.status)) {
      fail(`verification.ran[${i}] has unknown status: ${check.status}`);
    }
  }
  for (const [i, ring] of (envelope?.context ?? []).entries()) {
    if (!ring.path) fail(`context[${i}] has no path`);
  }
  if (envelope?.guards !== undefined) {
    if (typeof envelope.guards.ran !== 'boolean') fail('guards.ran must be a boolean');
    if (envelope.guards.ran && !Array.isArray(envelope.guards.findings)) {
      fail('guards.findings must be an array when guards ran');
    }
    if (envelope.guards.clean === true && (envelope.guards.findings?.length || envelope.guards.failures?.length)) {
      fail('guards.clean must be false when findings or failures exist');
    }
  }
  return problems;
}

const bullet = (items, empty = '_none_') =>
  items?.length ? items.map((i) => `- ${i}`).join('\n') : empty;

/** Markdown rendering — what a human or an agent actually reads. */
export function toMarkdown(envelope) {
  const { scope, change, repository, verification } = envelope;
  const s = change.summary;

  const files = change.files.length
    ? change.files
        .map((f) => `| \`${f.path}\` | ${f.status} | ${f.kind} | +${f.additions} / −${f.deletions} |`)
        .join('\n')
    : '| _no files in scope_ | | | |';

  const rings = envelope.context.length
    ? envelope.context
        .map((r) =>
          [
            `**\`${r.path}\`**`,
            `- package: ${r.package ? `\`${r.package.dir}\` (${r.package.manifest})` : '_none found_'}`,
            `- local imports: ${r.imports.length ? r.imports.map((i) => `\`${i}\``).join(', ') : '_none_'}`,
            `- likely callers: ${r.callers.length ? r.callers.map((i) => `\`${i}\``).join(', ') : '_none discoverable_'}`,
            `- related tests: ${r.tests.length ? r.tests.map((i) => `\`${i}\``).join(', ') : '_none found_'}`,
          ].join('\n'),
        )
        .join('\n\n')
    : '_no changed paths to expand_';

  const ran = verification.ran.length
    ? verification.ran
        .map((c) => `| \`${c.command}\` | ${c.ran ? c.status : 'not run'} | ${c.exitCode ?? '—'} |`)
        .join('\n')
    : '| _nothing was run_ | — | — |';

  const guardsSection = (() => {
    const g = envelope.guards;
    if (!g || g.ran !== true) return 'Not requested for this envelope (`--guards` opts in).';
    const lines = [];
    if (g.provenance) {
      const p = g.provenance;
      lines.push(
        `${g.findings.length} finding(s) (introduced ${p.introduced} · worsened ${p.worsened} · exposed ${p.exposed} · pre-existing ${p.preExisting} · resolved ${p.resolved})`,
      );
    } else {
      lines.push(`${g.findings.length} finding(s), no baseline comparison.`);
    }
    for (const f of g.findings.slice(0, 40)) {
      lines.push(`- \`${f.path}:${f.line}\` [${f.rule_id}]${f.provenance ? ` (${f.provenance})` : ''} — ${f.message}`);
    }
    if (g.findings.length > 40) lines.push(`- … ${g.findings.length - 40} more (see JSON) …`);
    for (const failure of g.failures ?? []) {
      lines.push(`- ! ${failure.path ?? '(global)'} [${failure.language}] ${failure.reason}${failure.detail ? ` — ${failure.detail}` : ''}`);
    }
    if (!g.findings.length && !(g.failures ?? []).length) lines.push('Clean: no deterministic findings.');
    return lines.join('\n');
  })();

  return `# Change envelope

- **Verb** · ${scope.verb}
- **Scope** · ${scope.describe}
- **Base** · ${scope.base ?? '—'}${scope.head ? ` → **Head** · ${scope.head}` : ''}
- **Intent** · ${envelope.intent ?? '_not supplied_'}
- **Repository** · \`${repository.root}\`${repository.branch ? ` (branch \`${repository.branch}\`)` : ''}
- **Working tree** · ${repository.cleanWorkingTree ? 'clean' : `${repository.dirtyPaths.length} dirty path(s)`}

## Change surface

${s.files} file(s) · +${s.additions} / −${s.deletions} lines · ${s.directories} directory/ies · tests touched: ${s.touchesTests ? 'yes' : 'no'} · generated files touched: ${s.touchesGenerated ? 'yes' : 'no'}

| Path | Status | Kind | Lines |
| --- | --- | --- | --- |
${files}

## Repository morphology

- Tracked files: ${repository.tree.fileCount} (source ${repository.tree.counts.source ?? 0} · test ${repository.tree.counts.test ?? 0} · docs ${repository.tree.counts.docs ?? 0} · config ${repository.tree.counts.config ?? 0} · generated ${repository.tree.counts.generated ?? 0})
- Workspace: ${repository.workspace.monorepo ? `monorepo, ${repository.workspace.packageCount} packages` : 'single package'}
- Top level: ${repository.tree.topLevel.slice(0, 12).map((t) => `\`${t.path}\` (${t.files})`).join(' · ')}

### Declared intent sources

Instructions:
${bullet(repository.instructions.map((i) => `\`${i}\``))}

Architecture claims:
${bullet(repository.architectureDocs.map((i) => `\`${i}\``))}

Manifests:
${bullet(repository.manifests.map((i) => `\`${i}\``))}

## Context rings

${rings}

## Verification

Declared by the repository:
${bullet(verification.declared.map((c) => `\`${c.command}\` (${c.source})`))}

Executed for this envelope:

| Command | Result | Exit |
| --- | --- | --- |
${ran}

## Deterministic guards

${guardsSection}

## Diff

${change.diffTruncated ? `> Truncated at ${change.diff.length} of ${change.diffBytes} bytes. Re-run with a narrower scope for the rest.\n` : ''}\`\`\`diff
${change.diff.trim() || '(no diff in this scope)'}
\`\`\`
`;
}
