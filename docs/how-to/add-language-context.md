# How-To: Add a Language to Context Expansion

This guide explains how to extend NeatCode's bounded context expansion engine in [`lib/context.mjs`](../../lib/context.mjs) to support local import resolution and caller discovery for a new programming language.

---

## Goal
Enable `neatcode envelope` to recognize and resolve local dependencies, callers, and tests for files written in a newly supported language (e.g. Swift, Kotlin, or Elixir).

---

## Prerequisites
- Node.js $\ge 20$.
- A local checkout of the NeatCode repository.
- Understanding of the target language's module import syntax and file extensions.

---

## Procedure

### Step 1: Register Source File Extensions
Open [`lib/context.mjs`](../../lib/context.mjs) and locate `SOURCE_EXTENSIONS` around line 25:

```javascript
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go', '.rb', '.java',
  '.kt', '.swift', '.cs', '.php', '.ex', '.exs', '.c', '.h', '.cc', '.cpp', '.hpp', '.scala',
]);
```

If your language's extension (e.g., `.clj`, `.zig`, or `.dart`) is missing, add it to the `Set`. This ensures that [`likelyCallers()`](../../lib/context.mjs#L79) will scan files with this extension.

### Step 2: Add Regex Import Patterns
In [`lib/context.mjs:15-23`](../../lib/context.mjs#L15-L23), locate `IMPORT_PATTERNS`. Add a regular expression that captures the relative local path string in capturing group `1`:

```javascript
const IMPORT_PATTERNS = [
  /^\s*import\s[\s\S]*?from\s+['"]([^'"]+)['"]/gm,   // ES modules
  /^\s*from\s+([\w.]+)\s+import\b/gm,                 // Python
  /^\s*use\s+(?:crate|super|self)::([\w:]+)/gm,       // Rust
  // Add your new pattern here:
  /^\s*import\s+['"]([^'"]+)['"]/gm,                  // Dart
];
```

### Step 3: Configure Candidate Path Expansions
In [`lib/context.mjs:64-73`](../../lib/context.mjs#L64-L73), locate `candidatePaths()`:
```javascript
function candidatePaths(fromDir, spec) {
  const base = join(fromDir, spec).split('\\').join('/');
  const out = [base];
  if (!extname(base)) {
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rs', '.go']) {
      out.push(`${base}${ext}`, `${base}/index${ext}`, `${base}/mod${ext}`);
    }
  }
  return out;
}
```
If your language allows omitting extensions in import statements (like TypeScript or Python), add its file extension to the array.

---

## Validation
Create a quick test or run the test suite:
```bash
npm test
```
Verify that `test/envelope.test.mjs` and `test/diff.test.mjs` pass cleanly without regressions.

---

## Common Failure Symptoms
- **Context Rings show `local imports: _none_`**: The regex pattern in `IMPORT_PATTERNS` did not match or did not capture the path in Group 1. Ensure the `m` (multiline) and `g` (global) flags are present.
- **Imports not resolving**: The path separator in `candidatePaths` was not normalized across Windows/Linux. Always chain `.split('\\').join('/')`.
