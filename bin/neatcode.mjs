#!/usr/bin/env node
// NeatCode's evidence harness. It acquires and structures a change envelope.
// It never judges one — that is the skill's job.

import { readFileSync } from 'node:fs';
import { buildEnvelope, toMarkdown, validateEnvelope } from '../lib/envelope.mjs';
import { discoverChecks } from '../lib/verify.mjs';
import { repoRoot } from '../lib/git.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const VERSION = pkg.version;

const HELP = `neatcode ${VERSION} — change-envelope harness

Usage
  neatcode envelope [scope] [options]   Build the change envelope
  neatcode checks                       List verification commands the repo declares
  neatcode --version | --help

Scope (pick one; default is the working tree)
  --working-tree           Uncommitted changes vs HEAD (default)
  --staged                 Staged changes vs HEAD
  --commit <rev>           A single commit
  --range <a..b>           A commit range; a...b compares branches
  --patch <file>           A patch file
  --stdin                  A unified diff on stdin
  --paths <p> [p...]       Named files or directories, no diff
  --repo                   Whole repository, no diff

Options
  --verb <name>            review | audit | restructure | study | harden | build
  --intent <text>          The requested outcome, in the requester's words
  --verify <command>       Run and record a verification command (repeatable)
  --json                   Emit JSON instead of Markdown
  --strict                 Exit non-zero if the envelope fails validation
  --max-diff-bytes <n>     Truncation ceiling for the embedded diff

Examples
  neatcode envelope --staged --verb review --verify "npm test"
  neatcode envelope --range main...HEAD --verb review
  neatcode envelope --paths src/billing --verb audit
  neatcode envelope --repo --verb study --json > engineering-envelope.json
`;

function parseArgs(argv) {
  const opts = {
    command: null,
    source: { mode: 'working-tree', paths: [] },
    verb: 'review',
    intent: null,
    verify: [],
    json: false,
    strict: false,
    maxDiffBytes: undefined,
  };
  const rest = [...argv];
  while (rest.length) {
    const arg = rest.shift();
    switch (arg) {
      case '--help': case '-h': return { help: true };
      case '--version': case '-v': return { version: true };
      case 'envelope': case 'checks': opts.command = arg; break;
      case '--working-tree': opts.source.mode = 'working-tree'; break;
      case '--staged': case '--cached': opts.source.mode = 'staged'; break;
      case '--repo': case '--repository': opts.source.mode = 'repository'; break;
      case '--commit': opts.source.mode = 'commit'; opts.source.rev = need(rest, arg); break;
      case '--range': opts.source.mode = 'range'; opts.source.range = need(rest, arg); break;
      case '--patch': opts.source.mode = 'patch'; opts.source.patch = need(rest, arg); break;
      case '--stdin': opts.source.mode = 'diff-text'; break;
      case '--paths':
        opts.source.mode = 'paths';
        while (rest.length && !rest[0].startsWith('--')) opts.source.paths.push(rest.shift());
        break;
      case '--verb': opts.verb = need(rest, arg); break;
      case '--intent': opts.intent = need(rest, arg); break;
      case '--verify': opts.verify.push(need(rest, arg)); break;
      case '--json': opts.json = true; break;
      case '--strict': opts.strict = true; break;
      case '--max-diff-bytes': opts.maxDiffBytes = Number(need(rest, arg)); break;
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

function main(argv) {
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

process.exitCode = main(process.argv.slice(2));
