#!/usr/bin/env node
// NeatCode's evidence harness. It acquires and structures evidence:
// change envelopes, deterministic guard findings, environment inventory,
// and manages self-update and installation diagnostics.
// It never judges any of it — that is the skill's job.

import { readFileSync } from 'node:fs';
import { buildEnvelope, toMarkdown, validateEnvelope } from '../lib/envelope.mjs';
import { discoverChecks } from '../lib/verify.mjs';
import { repoRoot } from '../lib/git.mjs';
import { runGuards, formatGuardsHuman, validateGuardResult, SUPPORTED_LANGUAGES } from '../lib/guards/index.mjs';
import { collectEnvironment, formatEnvironmentHuman } from '../lib/env/index.mjs';
import {
  fetchPackageMetadata,
  resolveUpdateCandidates,
  formatUpdateStatusHuman,
  reconcileAllInstallations,
  runDoctor,
  formatDoctorHuman,
  executeUpdate,
  finalizeUpdate,
  passiveUpdateCheck,
} from '../lib/update/index.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const VERSION = pkg.version;

const HELP = `neatcode ${VERSION} — evidence harness

Usage
  neatcode envelope [scope] [options]   Build the change envelope
  neatcode checks                       List verification commands the repo declares
  neatcode guard [options]              Run deterministic anti-slop guards
  neatcode environment [options]        Show machine capability inventory
  neatcode update [options]             Update NeatCode and managed skills
  neatcode doctor [options]             Diagnose NeatCode distribution and installations
  neatcode --version | --help

Scope (envelope; pick one; default is the working tree)
  --working-tree           Uncommitted changes vs HEAD (default)
  --staged                 Staged changes vs HEAD
  --commit <rev>           A single commit
  --range <a..b>           A commit range; a...b compares branches
  --patch <file>           A patch file
  --stdin                  A unified diff on stdin
  --paths <p> [p...]       Named files or directories, no diff
  --repo                   Whole repository, no diff

Envelope options
  --verb <name>            review | audit | restructure | study | harden | build
  --intent <text>          The requested outcome, in the requester's words
  --verify <command>       Run and record a verification command (repeatable)
  --guards                 Include deterministic guard evidence for changed paths
  --json                   Emit JSON instead of Markdown
  --strict                 Exit non-zero if the envelope fails validation
  --max-diff-bytes <n>     Truncation ceiling for the embedded diff

Guard options
  --paths <p> [p...]       Files or directories to scan (default: tracked files)
  --language <name>        javascript | typescript | python | go | rust (repeatable)
  --staged                 Label findings against the staged diff (baseline HEAD)
  --baseline <rev>         Label findings against working tree vs <rev>
  --all                    Include generated files and vendored guard sources
  --json                   Emit JSON instead of human-readable text
  --strict                 Exit 1 when any finding exists (default: 0 unless the run failed)

Environment options
  --agents                 Show only the agent inventory
  --services               Show only the agent-service (MCP) inventory
  --tools                  Show only toolchains and skills
  --json                   Emit JSON instead of human-readable text

Update options
  --check                  Check for updates without modifying installation
  --yes                    Noninteractive confirmation for safe updates
  --force                  Allow installing releases within the 24h soak window
  --repair                 Reconcile drifted managed skills to installed version
  --json                   Emit JSON instead of human-readable text

Doctor options
  --json                   Emit JSON instead of human-readable text

Exit codes
  0  success (guard: scan completed; findings are output, not failure)
  1  execution failure, strict validation/guard failure, or guard run incomplete
  2  syntax/usage errors

Examples
  neatcode envelope --staged --verb review --verify "npm test"
  neatcode envelope --range main...HEAD --verb review
  neatcode envelope --paths src/billing --verb audit
  neatcode envelope --repo --verb study --json > engineering-envelope.json
  neatcode guard --staged
  neatcode guard --paths src --language rust --json
  neatcode environment --agents
  neatcode update --check
  neatcode update --force
  neatcode update --repair
  neatcode doctor
`;

function parseArgs(argv) {
  const opts = {
    command: null,
    source: { mode: 'working-tree', paths: [] },
    verb: 'review',
    intent: null,
    verify: [],
    guards: false,
    json: false,
    strict: false,
    maxDiffBytes: undefined,
    guardPaths: [],
    guardLanguages: [],
    guardAll: false,
    staged: false,
    baseline: null,
    envSections: [],
    check: false,
    yes: false,
    force: false,
    repair: false,
    targetVersion: null,
  };
  const rest = [...argv];
  while (rest.length) {
    const arg = rest.shift();
    switch (arg) {
      case '--help': case '-h': return { help: true };
      case '--version': case '-v': return { version: true };
      case 'envelope': case 'checks': case 'guard': case 'environment': case 'update': case 'doctor': case '_update-finalize': opts.command = arg; break;
      case '--working-tree': opts.source.mode = 'working-tree'; break;
      case '--staged': case '--cached':
        opts.source.mode = 'staged';
        opts.staged = true;
        break;
      case '--repo': case '--repository': opts.source.mode = 'repository'; break;
      case '--commit': opts.source.mode = 'commit'; opts.source.rev = need(rest, arg); break;
      case '--range': opts.source.mode = 'range'; opts.source.range = need(rest, arg); break;
      case '--patch': opts.source.mode = 'patch'; opts.source.patch = need(rest, arg); break;
      case '--stdin': opts.source.mode = 'diff-text'; break;
      case '--paths':
        opts.source.mode = 'paths';
        while (rest.length && !rest[0].startsWith('--')) {
          const p = rest.shift();
          opts.source.paths.push(p);
          opts.guardPaths.push(p);
        }
        break;
      case '--verb': opts.verb = need(rest, arg); break;
      case '--intent': opts.intent = need(rest, arg); break;
      case '--verify': opts.verify.push(need(rest, arg)); break;
      case '--guards': opts.guards = true; break;
      case '--language': opts.guardLanguages.push(need(rest, arg)); break;
      case '--baseline': opts.baseline = need(rest, arg); break;
      case '--all': opts.guardAll = true; break;
      case '--agents': opts.envSections.push('agents'); break;
      case '--services': opts.envSections.push('services'); break;
      case '--tools': opts.envSections.push('tools', 'skills'); break;
      case '--json': opts.json = true; break;
      case '--strict': opts.strict = true; break;
      case '--max-diff-bytes': opts.maxDiffBytes = Number(need(rest, arg)); break;
      case '--check': opts.check = true; break;
      case '--yes': case '-y': opts.yes = true; break;
      case '--force': opts.force = true; break;
      case '--repair': opts.repair = true; break;
      case '--target-version': opts.targetVersion = need(rest, arg); break;
      default:
        if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`);
        if (!opts.command) opts.command = arg;
        else opts.source.paths.push(arg);
    }
  }
  return opts;
}

function need(rest, flag) {
  if (!rest.length || rest[0].startsWith('--')) throw new Error(`${flag} needs a value`);
  return rest.shift();
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function scanRoot() {
  try {
    return repoRoot(process.cwd());
  } catch {
    return process.cwd(); // ad-hoc directory, not a repository: scan it directly
  }
}

function runGuardCommand(opts) {
  const root = scanRoot();
  for (const language of opts.guardLanguages) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      process.stderr.write(`neatcode: unknown language "${language}" (supported: ${SUPPORTED_LANGUAGES.join(', ')})\n`);
      return 2;
    }
  }
  const paths = opts.guardPaths.length ? opts.guardPaths : null;
  const baseline = opts.baseline ?? (opts.staged ? 'HEAD' : null);
  const diffSource = opts.staged ? { mode: 'staged' } : opts.baseline ? { mode: 'working-tree' } : null;
  const result = runGuards({
    root,
    paths,
    languages: opts.guardLanguages.length ? opts.guardLanguages : null,
    includeGenerated: opts.guardAll,
    baseline,
    diffSource,
  });
  const problems = validateGuardResult(result);
  for (const problem of problems) process.stderr.write(`neatcode: guard problem — ${problem}\n`);

  process.stdout.write(opts.json ? `${JSON.stringify(result, null, 2)}\n` : formatGuardsHuman(result));

  if (problems.length || result.failures.length) return 1;
  if (opts.strict && result.findings.length) return 1;
  return 0;
}

async function runEnvironmentCommand(opts) {
  const cwd = process.cwd();
  let project = null;
  try {
    project = repoRoot(cwd);
  } catch {
    project = cwd;
  }
  const sections = opts.envSections.length ? [...new Set(opts.envSections)] : null;
  const env = await collectEnvironment({ project, sections });
  process.stdout.write(opts.json ? `${JSON.stringify(env, null, 2)}\n` : formatEnvironmentHuman(env));
  return 0;
}

async function runUpdateCommand(opts) {
  const root = scanRoot();

  // Repair path: reconcile managed skills across active agent roots
  if (opts.repair) {
    const res = reconcileAllInstallations({ project: root });
    if (opts.json) {
      process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
    } else {
      process.stdout.write('NeatCode Installation Repair\n\n');
      for (const item of res.reconciled) {
        process.stdout.write(`  ${item.result.success ? '✓' : '!'} ${item.agent.padEnd(20)} ${item.result.reason}\n`);
      }
      process.stdout.write('\n');
      if (res.warnings.length) {
        process.stdout.write('Warnings:\n');
        for (const w of res.warnings) process.stdout.write(`  - ${w}\n`);
        process.stdout.write('\n');
      }
      process.stdout.write('Repair completed.\n');
    }
    return 0;
  }

  // Fetch registry metadata and resolve update candidates
  let meta;
  try {
    meta = await fetchPackageMetadata();
  } catch (error) {
    process.stderr.write(`neatcode update: failed to fetch registry metadata — ${error.message}\n`);
    return 1;
  }

  const plan = resolveUpdateCandidates({
    installedVersion: VERSION,
    versions: meta.versions,
    time: meta.time,
    now: meta.serverDate ?? new Date(),
    force: opts.force,
  });

  const doc = await runDoctor({ project: root, checkRemote: false });
  const hasDrift = doc.repairableCount > 0;

  if (opts.check) {
    if (opts.json) {
      process.stdout.write(`${JSON.stringify({ ...plan, installationDrift: hasDrift }, null, 2)}\n`);
    } else {
      process.stdout.write(formatUpdateStatusHuman(plan, { installationDrift: hasDrift }));
    }
    return 0;
  }

  // Mutation path: perform update
  if (!plan.updateAvailable) {
    if (plan.forceRequired) {
      process.stdout.write(formatUpdateStatusHuman(plan, { installationDrift: hasDrift }));
      return 1;
    }
    if (hasDrift) {
      process.stdout.write(`NeatCode ${VERSION} executable is current, but installation drift was detected.\nReconciling installations...\n\n`);
      reconcileAllInstallations({ project: root });
      process.stdout.write('Installations reconciled.\n');
      return 0;
    }
    process.stdout.write(`NeatCode ${VERSION} is up to date.\n`);
    return 0;
  }

  process.stdout.write(`Updating NeatCode ${VERSION} → ${plan.targetVersion}...\n`);
  const updateResult = await executeUpdate({
    targetVersion: plan.targetVersion,
    project: root,
  });

  if (!updateResult.success) {
    process.stderr.write(`neatcode update error: ${updateResult.message}\n`);
    return 1;
  }

  process.stdout.write(`${updateResult.message}\n`);
  return 0;
}

async function runDoctorCommand(opts) {
  const root = scanRoot();
  const doc = await runDoctor({ project: root });
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
  } else {
    process.stdout.write(formatDoctorHuman(doc));
  }
  return doc.distribution.coherent ? 0 : 1;
}

async function runFinalizeCommand(opts) {
  const root = scanRoot();
  const res = await finalizeUpdate({
    targetVersion: opts.targetVersion,
    project: root,
  });
  if (!res.success) {
    for (const err of res.errors) process.stderr.write(`neatcode finalize error: ${err}\n`);
    return 1;
  }
  return 0;
}

async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`neatcode: ${error.message}\n\n${HELP}`);
    return 2;
  }

  if (opts.help || (!opts.command && argv.length === 0)) {
    process.stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  // Trigger passive update check quietly in background for standard commands
  if (opts.command && !['update', 'doctor', '_update-finalize'].includes(opts.command) && !opts.json) {
    passiveUpdateCheck({ installedVersion: VERSION }).catch(() => {});
  }

  try {
    if (opts.command === 'checks') {
      const root = repoRoot(process.cwd());
      const checks = discoverChecks(root);
      if (!checks.length) {
        process.stdout.write('No verification commands declared by this repository.\n');
        return 0;
      }
      for (const c of checks) process.stdout.write(`${c.command}\t(${c.source})\n`);
      return 0;
    }

    if (opts.command === 'guard') return runGuardCommand(opts);

    if (opts.command === 'environment') return runEnvironmentCommand(opts);

    if (opts.command === 'update') return await runUpdateCommand(opts);

    if (opts.command === 'doctor') return await runDoctorCommand(opts);

    if (opts.command === '_update-finalize') return await runFinalizeCommand(opts);

    if (opts.command !== 'envelope') {
      process.stderr.write(`neatcode: unknown command "${opts.command}"\n\n${HELP}`);
      return 2;
    }

    if (opts.source.mode === 'diff-text') opts.source.diff = readStdin();

    const envelope = buildEnvelope({
      source: opts.source,
      verb: opts.verb,
      intent: opts.intent,
      verify: opts.verify,
      maxDiffBytes: opts.maxDiffBytes,
      guards: opts.guards,
    });

    const problems = validateEnvelope(envelope);
    for (const problem of problems) process.stderr.write(`neatcode: envelope problem — ${problem}\n`);

    process.stdout.write(opts.json ? `${JSON.stringify(envelope, null, 2)}\n` : toMarkdown(envelope));
    return opts.strict && problems.length ? 1 : 0;
  } catch (error) {
    process.stderr.write(`neatcode: ${error.message}\n`);
    return 1;
  }
}

// Keep process alive until async main settles
const codePromise = main(process.argv.slice(2));
if (codePromise && typeof codePromise.then === 'function') {
  codePromise.then(
    (exit) => { process.exitCode = exit; },
    (error) => {
      process.stderr.write(`neatcode: ${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
