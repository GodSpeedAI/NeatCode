import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENVELOPE_VERSION, buildEnvelope, toMarkdown, validateEnvelope } from '../lib/envelope.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(REPO, 'bin', 'neatcode.mjs');

/** A throwaway git repository with one commit and one staged change. */
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'neatcode-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });

  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');

  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fixture', scripts: { test: 'echo ok' } }));
  writeFileSync(join(dir, 'AGENTS.md'), '# Rules\nDomain must not import infra.\n');
  writeFileSync(join(dir, 'README.md'), '# Fixture\n');
  writeFileSync(join(dir, 'src/state.js'), 'export const initial = 1;\n');
  writeFileSync(join(dir, 'src/resume.js'), "import { initial } from './state.js';\nexport const resume = () => initial;\n");
  writeFileSync(join(dir, 'src/resume.test.js'), "import './resume.js';\n");
  git('add', '-A');
  git('commit', '-q', '-m', 'initial');

  writeFileSync(join(dir, 'src/resume.js'), "import { initial } from './state.js';\nexport const resume = () => initial + 1;\n");
  git('add', 'src/resume.js');

  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('builds a staged envelope with change, morphology and context rings', () => {
  const { dir, cleanup } = fixture();
  try {
    const envelope = buildEnvelope({ cwd: dir, source: { mode: 'staged' }, verb: 'review', intent: 'bump the value' });

    assert.equal(envelope.neatcode.envelope, ENVELOPE_VERSION);
    assert.equal(envelope.scope.verb, 'review');
    assert.equal(envelope.scope.mode, 'staged');
    assert.equal(envelope.intent, 'bump the value');

    assert.deepEqual(envelope.change.files.map((f) => f.path), ['src/resume.js']);
    assert.equal(envelope.change.files[0].status, 'modified');
    assert.match(envelope.change.diff, /initial \+ 1/);

    assert.ok(envelope.repository.instructions.includes('AGENTS.md'));
    assert.ok(envelope.repository.architectureDocs.includes('README.md'));
    assert.ok(envelope.repository.manifests.includes('package.json'));
    assert.equal(envelope.repository.branch, 'main');

    const [ring] = envelope.context;
    assert.equal(ring.path, 'src/resume.js');
    assert.deepEqual(ring.imports, ['src/state.js']);
    assert.deepEqual(ring.tests, ['src/resume.test.js']);
    assert.equal(ring.package.manifest, 'package.json');

    assert.deepEqual(validateEnvelope(envelope), []);
  } finally {
    cleanup();
  }
});

test('records whether a verification command actually ran', () => {
  const { dir, cleanup } = fixture();
  try {
    const envelope = buildEnvelope({
      cwd: dir,
      source: { mode: 'staged' },
      verify: ['exit 0', 'exit 3'],
    });
    const [passed, failed] = envelope.verification.ran;
    assert.equal(passed.status, 'passed');
    assert.equal(passed.ran, true);
    assert.equal(failed.status, 'failed');
    assert.equal(failed.exitCode, 3);
    assert.ok(envelope.verification.declared.some((c) => c.command === 'npm run test'));
  } finally {
    cleanup();
  }
});

test('supports commit, range and paths scopes', () => {
  const { dir, cleanup } = fixture();
  try {
    const commit = buildEnvelope({ cwd: dir, source: { mode: 'commit', rev: 'HEAD' } });
    assert.ok(commit.change.files.length >= 4);
    assert.equal(commit.change.files.every((f) => f.status === 'added'), true);

    const range = buildEnvelope({ cwd: dir, source: { mode: 'range', range: 'HEAD..HEAD' } });
    assert.deepEqual(range.change.files, []);

    const paths = buildEnvelope({ cwd: dir, source: { mode: 'paths', paths: ['src/state.js'] }, verb: 'audit' });
    assert.equal(paths.change.diff, '');
    assert.deepEqual(paths.context.map((r) => r.path), ['src/state.js']);
    assert.deepEqual(validateEnvelope(paths), []);
  } finally {
    cleanup();
  }
});

test('validation rejects malformed envelopes', () => {
  const { dir, cleanup } = fixture();
  try {
    const good = buildEnvelope({ cwd: dir, source: { mode: 'staged' } });

    assert.ok(validateEnvelope({}).length > 0);

    const badVersion = structuredClone(good);
    badVersion.neatcode.envelope = 99;
    assert.ok(validateEnvelope(badVersion).some((p) => p.includes('envelope version')));

    const badMode = structuredClone(good);
    badMode.scope.mode = 'telepathy';
    assert.ok(validateEnvelope(badMode).some((p) => p.includes('unknown scope mode')));

    const badStatus = structuredClone(good);
    badStatus.change.files[0].status = 'vibes';
    assert.ok(validateEnvelope(badStatus).some((p) => p.includes('unknown status')));

    // Diff text that parsed to nothing means acquisition silently failed.
    const lostFiles = structuredClone(good);
    lostFiles.change.files = [];
    assert.ok(validateEnvelope(lostFiles).some((p) => p.includes('no files parsed')));

    const badCheck = structuredClone(good);
    badCheck.verification.ran = [{ command: 'x', ran: true, status: 'probably-fine' }];
    assert.ok(validateEnvelope(badCheck).some((p) => p.includes('unknown status')));
  } finally {
    cleanup();
  }
});

test('markdown rendering carries the sections the skill reads', () => {
  const { dir, cleanup } = fixture();
  try {
    const md = toMarkdown(buildEnvelope({ cwd: dir, source: { mode: 'staged' }, verb: 'review' }));
    for (const heading of [
      '# Change envelope',
      '## Change surface',
      '## Repository morphology',
      '## Context rings',
      '## Verification',
      '## Diff',
    ]) {
      assert.ok(md.includes(heading), `missing ${heading}`);
    }
    assert.match(md, /src\/resume\.js/);
  } finally {
    cleanup();
  }
});

test('the CLI emits markdown by default and JSON on request', () => {
  const { dir, cleanup } = fixture();
  try {
    const md = execFileSync(process.execPath, [CLI, 'envelope', '--staged'], { cwd: dir, encoding: 'utf8' });
    assert.match(md, /^# Change envelope/);

    const json = execFileSync(process.execPath, [CLI, 'envelope', '--staged', '--json', '--verb', 'audit'], {
      cwd: dir,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.scope.verb, 'audit');
    assert.equal(parsed.neatcode.envelope, ENVELOPE_VERSION);

    const checks = execFileSync(process.execPath, [CLI, 'checks'], { cwd: dir, encoding: 'utf8' });
    assert.match(checks, /npm run test/);

    const help = execFileSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
    assert.match(help, /neatcode envelope/);
  } finally {
    cleanup();
  }
});
