import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPath, parseDiff, summarizeChange } from '../lib/diff.mjs';

const MODIFIED = `diff --git a/src/billing/resume.ts b/src/billing/resume.ts
index 1111111..2222222 100644
--- a/src/billing/resume.ts
+++ b/src/billing/resume.ts
@@ -88,6 +88,9 @@ export function resume(id: string) {
   const sub = load(id);
-  sub.status = 'active';
+  SubscriptionState.transition(sub, 'active');
+  audit.record(sub);
+  return sub;
 }
`;

const ADDED = `diff --git a/src/billing/period.ts b/src/billing/period.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/billing/period.ts
@@ -0,0 +1,3 @@
+export function roundToPeriodStart(d: Date) {
+  return d;
+}
`;

const DELETED = `diff --git a/src/legacy/old.ts b/src/legacy/old.ts
deleted file mode 100644
index 4444444..0000000
--- a/src/legacy/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const gone = 1;
-export const alsoGone = 2;
`;

const RENAMED = `diff --git a/src/a.ts b/src/b.ts
similarity index 92%
rename from src/a.ts
rename to src/b.ts
index 5555555..6666666 100644
--- a/src/a.ts
+++ b/src/b.ts
@@ -1,2 +1,2 @@
-const x = 1;
+const x = 2;
 const y = 3;
`;

const BINARY = `diff --git a/docs/logo.png b/docs/logo.png
index 7777777..8888888 100644
Binary files a/docs/logo.png and b/docs/logo.png differ
`;

test('parses a modified file with hunk positions and line counts', () => {
  const { files, additions, deletions } = parseDiff(MODIFIED);
  assert.equal(files.length, 1);
  const [file] = files;
  assert.equal(file.path, 'src/billing/resume.ts');
  assert.equal(file.status, 'modified');
  assert.equal(file.kind, 'source');
  assert.equal(file.additions, 3);
  assert.equal(file.deletions, 1);
  assert.equal(additions, 3);
  assert.equal(deletions, 1);
  assert.deepEqual(file.hunks, [
    { oldStart: 88, oldLines: 6, newStart: 88, newLines: 9, section: 'export function resume(id: string) {' },
  ]);
});

test('detects added, deleted, renamed and binary files', () => {
  assert.equal(parseDiff(ADDED).files[0].status, 'added');

  const deleted = parseDiff(DELETED).files[0];
  assert.equal(deleted.status, 'deleted');
  assert.equal(deleted.deletions, 2);

  const renamed = parseDiff(RENAMED).files[0];
  assert.equal(renamed.status, 'renamed');
  assert.equal(renamed.oldPath, 'src/a.ts');
  assert.equal(renamed.newPath, 'src/b.ts');
  assert.equal(renamed.path, 'src/b.ts');
  assert.equal(renamed.similarity, 92);

  const binary = parseDiff(BINARY).files[0];
  assert.equal(binary.binary, true);
  assert.equal(binary.path, 'docs/logo.png');
});

test('parses a multi-file diff without losing files', () => {
  const { files } = parseDiff([MODIFIED, ADDED, DELETED, RENAMED].join(''));
  assert.deepEqual(
    files.map((f) => f.path),
    ['src/billing/resume.ts', 'src/billing/period.ts', 'src/legacy/old.ts', 'src/b.ts'],
  );
});

test('handles paths containing spaces', () => {
  const diff = `diff --git a/src/my dir/file name.ts b/src/my dir/file name.ts
--- a/src/my dir/file name.ts
+++ b/src/my dir/file name.ts
@@ -1 +1 @@
-a
+b
`;
  assert.equal(parseDiff(diff).files[0].path, 'src/my dir/file name.ts');
});

test('treats an empty diff as an empty change rather than throwing', () => {
  assert.deepEqual(parseDiff(''), { files: [], additions: 0, deletions: 0 });
  assert.deepEqual(parseDiff('   \n'), { files: [], additions: 0, deletions: 0 });
});

test('a hunk header without counts means one line', () => {
  const diff = `diff --git a/a.txt b/a.txt
--- a/a.txt
+++ b/a.txt
@@ -3 +3 @@
-old
+new
`;
  assert.deepEqual(parseDiff(diff).files[0].hunks[0], {
    oldStart: 3, oldLines: 1, newStart: 3, newLines: 1, section: '',
  });
});

test('classifies paths into the kinds the phenotype protocol needs', () => {
  assert.equal(classifyPath('src/app.ts'), 'source');
  assert.equal(classifyPath('src/app.test.ts'), 'test');
  assert.equal(classifyPath('tests/app.py'), 'test');
  assert.equal(classifyPath('internal/thing_test.go'), 'test');
  assert.equal(classifyPath('package-lock.json'), 'generated');
  assert.equal(classifyPath('dist/bundle.js'), 'generated');
  assert.equal(classifyPath('docs/adr/0001.md'), 'docs');
  assert.equal(classifyPath('tsconfig.json'), 'config');
  // Assets are neither source nor docs — counting them as source inflates the change surface.
  assert.equal(classifyPath('docs/screenshots/hero.jpg'), 'asset');
  assert.equal(classifyPath('site/favicon-light.svg'), 'asset');
});

test('summarizes change shape for the change-discipline gates', () => {
  const summary = summarizeChange(parseDiff([MODIFIED, ADDED, BINARY].join('')));
  assert.equal(summary.files, 3);
  assert.equal(summary.directories, 2);
  assert.equal(summary.byKind.source, 2);
  assert.equal(summary.byKind.asset, 1);
  assert.equal(summary.touchesTests, false);
  assert.equal(summary.touchesGenerated, false);
});
