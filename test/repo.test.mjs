import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectRepository,
  detectWorkspace,
  findArchitectureDocs,
  findInstructions,
  findManifests,
  owningPackage,
  readTree,
  sizeOutliers,
} from '../lib/repo.mjs';

test('findArchitectureDocs discovers lowercase architecture.md and README.md', () => {
  const docs = findArchitectureDocs(process.cwd());
  assert.ok(docs.includes('architecture.md'), 'must find lowercase architecture.md');
  assert.ok(docs.includes('README.md'), 'must find README.md');
});

test('findInstructions discovers instruction files', () => {
  const instructions = findInstructions(process.cwd());
  assert.ok(instructions.includes('AGENTS.md'), 'must find AGENTS.md');
});

test('findManifests discovers package.json', () => {
  const manifests = findManifests(process.cwd());
  assert.ok(manifests.includes('package.json'));
});

test('detectWorkspace detects single package workspace', () => {
  const ws = detectWorkspace(process.cwd());
  assert.equal(ws.monorepo, false);
  assert.ok(ws.packageCount >= 1);
});

test('owningPackage normalizes directory paths with forward slashes', () => {
  const pkg = owningPackage(process.cwd(), 'bin/neatcode.mjs');
  assert.ok(pkg);
  assert.equal(pkg.dir, '.');
  assert.equal(pkg.manifest, 'package.json');

  const libPkg = owningPackage(process.cwd(), 'lib/repo.mjs');
  assert.ok(libPkg);
  assert.equal(libPkg.manifest, 'package.json');
  assert.ok(!libPkg.dir.includes('\\'), 'dir must not contain backslashes');
});

test('readTree and sizeOutliers extract morphology signals', () => {
  const tree = readTree(process.cwd());
  assert.ok(tree.fileCount > 50);
  assert.ok(tree.counts.source > 0);
  assert.ok(tree.counts.docs > 0);
  assert.ok(Array.isArray(tree.topLevel));

  const outliers = sizeOutliers(process.cwd());
  assert.ok(Array.isArray(outliers));
  assert.ok(outliers.length > 0);
  assert.ok(outliers[0].bytes > 0);
});

test('collectRepository synthesizes complete morphology payload', () => {
  const repo = collectRepository(process.cwd());
  assert.equal(repo.root, process.cwd());
  assert.ok(repo.tree.fileCount > 0);
  assert.ok(repo.architectureDocs.includes('architecture.md'));
});
