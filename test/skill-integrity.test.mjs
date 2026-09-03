// The refactor's own guard rail: the skill's link graph, its verb surface, its
// documented commands, and its package metadata must agree with what is on disk.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIR = join(ROOT, 'skills', 'neatcode');
const SKILL = join(SKILL_DIR, 'SKILL.md');
const REFERENCES = join(SKILL_DIR, 'references');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const VERBS = ['review', 'audit', 'restructure', 'study', 'harden'];

// Assembled at runtime so this guard file does not trip its own guard.
const LEGACY_NAME = ['hall', 'mark'].join('');

const TAXONOMY_FAMILIES = [
  'epistemic', 'context', 'contract', 'completion', 'abstraction', 'authority',
  'boundary', 'state-and-concurrency', 'failure-handling', 'tests',
  'observability', 'security', 'change-discipline', 'maintainability-theater',
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const markdownFiles = walk(SKILL_DIR).filter((f) => f.endsWith('.md'));

/** Relative markdown links, excluding anchors, external URLs and code spans. */
function linksIn(file) {
  const raw = readFileSync(file, 'utf8');
  const text = raw.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const links = [];
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    links.push(target);
  }
  return links;
}

test('package metadata points at files that exist', () => {
  assert.equal(pkg.name, '@godspeedai/neatcode');
  assert.ok(existsSync(join(ROOT, pkg.skill.entry)), `missing ${pkg.skill.entry}`);
  assert.ok(existsSync(join(ROOT, pkg.skill.references)), `missing ${pkg.skill.references}`);
  assert.equal(pkg.skill.entry, 'skills/neatcode/SKILL.md');

  for (const [name, path] of Object.entries(pkg.bin)) {
    assert.ok(existsSync(join(ROOT, path)), `bin ${name} -> ${path} missing`);
  }
});

test('published package contents include the skill and the harness', () => {
  for (const dir of ['skills', 'bin', 'lib']) {
    assert.ok(pkg.files.includes(dir), `package.files must include ${dir}`);
    assert.ok(existsSync(join(ROOT, dir)), `${dir}/ missing`);
  }
});

test('skill frontmatter is well formed and matches the package version', () => {
  const text = readFileSync(SKILL, 'utf8');
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text);
  assert.ok(frontmatter, 'SKILL.md needs YAML frontmatter');

  const fields = Object.fromEntries(
    frontmatter[1].split('\n').map((line) => {
      const at = line.indexOf(':');
      let value = line.slice(at + 1).trim();
      // release-please annotates the version line with a trailing YAML comment
      // (`# x-release-please-version`); strip it the way a real YAML parser would.
      if (!value.startsWith('"')) value = value.replace(/\s+#.*$/, '').trim();
      return [line.slice(0, at).trim(), value.replace(/^"|"$/g, '')];
    }),
  );

  assert.equal(fields.name, 'neatcode');
  assert.equal(fields.version, pkg.version);
  assert.ok(fields.description.length > 80, 'description must describe when to invoke the skill');
  for (const verb of VERBS) {
    assert.ok(fields.description.includes(verb), `description should mention ${verb}`);
  }

  const cliVersion = execFileSync(process.execPath, [join(ROOT, 'bin', 'neatcode.mjs'), '--version'], {
    encoding: 'utf8',
  }).trim();
  assert.equal(cliVersion, pkg.version, 'bin/neatcode.mjs --version must match package.json');
});

test('every relative link inside the skill resolves', () => {
  const broken = [];
  for (const file of markdownFiles) {
    for (const link of linksIn(file)) {
      const target = resolve(dirname(file), link);
      if (!existsSync(target)) broken.push(`${relative(ROOT, file)} -> ${link}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every relative link in documentation and root markdown resolves', () => {
  const docFiles = [
    ...walk(join(ROOT, 'docs')),
    join(ROOT, 'README.md'),
    join(ROOT, 'ROADMAP.md'),
    join(ROOT, 'architecture.md'),
    join(ROOT, 'documentation-map.md'),
    join(ROOT, 'source-map.md'),
  ].filter((f) => f.endsWith('.md'));

  const broken = [];
  for (const file of docFiles) {
    for (const link of linksIn(file)) {
      const target = resolve(dirname(file), link);
      if (!existsSync(target)) broken.push(`${relative(ROOT, file)} -> ${link}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every reference file is reachable from the skill entry', () => {
  const seen = new Set();
  const queue = [SKILL];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file) || !existsSync(file) || !file.endsWith('.md')) continue;
    seen.add(file);
    for (const link of linksIn(file)) queue.push(resolve(dirname(file), link));
  }
  const orphans = markdownFiles
    .filter((f) => !seen.has(f))
    .map((f) => relative(ROOT, f));
  assert.deepEqual(orphans, [], 'unreachable reference files');
});

test('the verb surface agrees across dispatch, files and docs', () => {
  const skillText = readFileSync(SKILL, 'utf8');
  const onDisk = readdirSync(join(REFERENCES, 'verbs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''))
    .sort();

  assert.deepEqual(onDisk, [...VERBS].sort());

  for (const verb of VERBS) {
    assert.ok(skillText.includes(`neatcode ${verb}`), `SKILL.md does not dispatch ${verb}`);
    assert.ok(
      skillText.includes(`references/verbs/${verb}.md`),
      `SKILL.md does not load references/verbs/${verb}.md`,
    );
  }

  // The old design verbs must be gone from the dispatch surface.
  for (const gone of ['redesign', `${LEGACY_NAME} study`, `${LEGACY_NAME} audit`]) {
    assert.ok(!skillText.includes(gone), `stale verb surface: ${gone}`);
  }
});

test('the taxonomy index and the family files match exactly', () => {
  const index = readFileSync(join(REFERENCES, 'taxonomy.md'), 'utf8');
  const onDisk = readdirSync(join(REFERENCES, 'taxonomy'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''))
    .sort();

  assert.deepEqual(onDisk, [...TAXONOMY_FAMILIES].sort());
  for (const family of TAXONOMY_FAMILIES) {
    assert.ok(index.includes(`taxonomy/${family}.md`), `taxonomy.md does not index ${family}`);
  }
});

test('no active instruction references a deleted design reference', () => {
  const deleted = [
    'macrostructures', 'component-cookbook', 'slop-test.md', 'anti-patterns.md',
    'design-md.md', 'custom-theme.md', 'hero-enrichment.md', 'typography.md',
    'imagery-kit.md', 'export-formats.md', 'genres/', 'themes/', 'preview-examples',
  ];
  const offenders = [];
  for (const file of markdownFiles) {
    const text = readFileSync(file, 'utf8');
    for (const term of deleted) {
      if (text.includes(term)) offenders.push(`${relative(ROOT, file)}: ${term}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('no stale product name survives outside attribution and history', () => {
  const allowed = new Set([
    'LICENSE',                      // required attribution
    'README.md',                    // documented derivation
    'ROADMAP.md',                   // documented derivation
    'site/index.html',              // documented derivation, in the footer
    'docs/origin-conversation.md',  // historical source material
  ]);
  const files = [
    ...walk(join(ROOT, 'skills')),
    ...walk(join(ROOT, 'lib')),
    ...walk(join(ROOT, 'bin')),
    ...walk(join(ROOT, 'test')),
    ...walk(join(ROOT, 'docs')),
    ...walk(join(ROOT, 'site')),
    join(ROOT, 'package.json'),
    join(ROOT, 'README.md'),
    join(ROOT, 'ROADMAP.md'),
    join(ROOT, 'LICENSE'),
    join(ROOT, '.gitignore'),
  ];
  const offenders = [];
  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (allowed.has(rel)) continue;
    if (/\.(png|jpe?g|mp4|ico)$/.test(file)) continue;
    if (new RegExp(LEGACY_NAME, 'i').test(readFileSync(file, 'utf8'))) offenders.push(rel);
  }
  assert.deepEqual(offenders, []);
});

test('documented commands match the CLI surface', () => {
  const cli = readFileSync(join(ROOT, 'bin', 'neatcode.mjs'), 'utf8');
  const flags = new Set([...cli.matchAll(/case '(--[a-z-]+)'/g)].map((m) => m[1]));
  const commands = new Set([...cli.matchAll(/case '(envelope|checks)'/g)].map((m) => m[1]));

  const docs = [
    SKILL,
    ...walk(REFERENCES),
    join(ROOT, 'README.md'),
    join(ROOT, 'docs', 'recipes.md'),
    join(ROOT, 'docs', 'study-examples.md'),
  ].filter((f) => f.endsWith('.md'));

  const problems = [];
  for (const file of docs) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/^\s*(?:\$ )?neatcode ([^\n`|]*)/gm)) {
      const tokens = match[1].trim().split(/\s+/).filter(Boolean);
      const [command, ...rest] = tokens;
      if (command.startsWith('--')) {
        if (!flags.has(command)) problems.push(`${relative(ROOT, file)}: unknown flag ${command}`);
        continue;
      }
      // Skill-level verbs (`neatcode review …`) are prose, not CLI commands.
      if (VERBS.includes(command)) continue;
      if (!commands.has(command)) {
        problems.push(`${relative(ROOT, file)}: unknown command "${command}"`);
        continue;
      }
      for (const token of rest) {
        if (token.startsWith('--') && !flags.has(token)) {
          problems.push(`${relative(ROOT, file)}: unknown flag ${token}`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('the six critique axes are stated identically wherever they appear', () => {
  const axes = ['correctness', 'repository fit', 'semantic integrity', 'restraint', 'operational credibility', 'evidence'];
  const skillText = readFileSync(SKILL, 'utf8').toLowerCase();
  for (const axis of axes) assert.ok(skillText.includes(axis), `SKILL.md missing axis: ${axis}`);

  const gates = readFileSync(join(REFERENCES, 'gates.md'), 'utf8').toLowerCase();
  for (const axis of axes) assert.ok(gates.includes(axis), `gates.md missing axis: ${axis}`);
});

test('the finding provenance vocabulary is fixed and shared', () => {
  const labels = ['introduced', 'worsened', 'exposed', 'pre-existing', 'resolved'];
  for (const file of ['findings.md', 'verbs/review.md']) {
    const text = readFileSync(join(REFERENCES, file), 'utf8');
    for (const label of labels) {
      assert.ok(text.includes(label), `${file} missing provenance label: ${label}`);
    }
  }
});
