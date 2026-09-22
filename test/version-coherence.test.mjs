// Deterministic version-coherence test.
// Establishes that all intentionally version-bearing NeatCode surfaces
// agree with the canonical package version.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

test('canonical version is defined in package.json', () => {
  assert.ok(pkg.version, 'package.json must declare a version');
  assert.match(pkg.version, /^\d+\.\d+\.\d+/, 'package.json version must be valid semver');
});

test('SKILL.md frontmatter matches canonical package version', () => {
  const skillText = readFileSync(join(ROOT, 'skills', 'neatcode', 'SKILL.md'), 'utf8');
  const match = /^---\n[\s\S]*?version:\s*([^\s#]+)/m.exec(skillText);
  assert.ok(match, 'SKILL.md must have frontmatter version');
  const skillVersion = match[1].replace(/^"|"$/g, '').trim();
  assert.equal(skillVersion, pkg.version, 'SKILL.md version must match package.json');
});

test('Claude plugin manifest matches canonical package version', () => {
  const plugin = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.equal(plugin.version, pkg.version, '.claude-plugin/plugin.json version must match package.json');
});

test('Release Please manifest matches canonical package version', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, '.release-please-manifest.json'), 'utf8'));
  assert.equal(manifest['.'], pkg.version, '.release-please-manifest.json version must match package.json');
});

test('CLI executable --version reports canonical package version', () => {
  const cliOutput = execFileSync(process.execPath, [join(ROOT, 'bin', 'neatcode.mjs'), '--version'], {
    encoding: 'utf8',
  }).trim();
  assert.equal(cliOutput, pkg.version, 'bin/neatcode.mjs --version must report canonical version');
});

test('Release Please config includes all version-bearing files', () => {
  const config = JSON.parse(readFileSync(join(ROOT, 'release-please-config.json'), 'utf8'));
  const pkgConfig = config.packages?.['.'];
  assert.ok(pkgConfig, 'release-please-config.json must configure root package');
  assert.equal(pkgConfig['release-type'], 'node');

  const extraFiles = pkgConfig['extra-files'] || [];
  const extraPaths = extraFiles.map((f) => (typeof f === 'string' ? f : f.path));

  assert.ok(extraPaths.includes('skills/neatcode/SKILL.md'), 'extra-files must include SKILL.md');
  assert.ok(extraPaths.includes('.claude-plugin/plugin.json'), 'extra-files must include plugin.json');
});

test('simulated drift between package.json and SKILL.md fails check', () => {
  const fakePackageVersion = '99.99.99';
  const skillText = readFileSync(join(ROOT, 'skills', 'neatcode', 'SKILL.md'), 'utf8');
  const match = /^---\n[\s\S]*?version:\s*([^\s#]+)/m.exec(skillText);
  const skillVersion = match[1].replace(/^"|"$/g, '').trim();

  assert.notEqual(skillVersion, fakePackageVersion, 'Drift detected when versions mismatch');
});
