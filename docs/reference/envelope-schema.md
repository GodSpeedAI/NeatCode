# Reference: Change Envelope Schema (v1)

This document is the formal schema specification for the Change Envelope emitted by `neatcode envelope --json`.

---

## Schema Overview

The envelope JSON adheres to schema revision `1` and comprises six top-level sections:
1. `neatcode`: Metadata and schema version.
2. `scope`: Invocation mode, target verb, base/head commit SHAs.
3. `intent`: User-specified intent text.
4. `change`: Diff hunks, line additions/deletions, file statuses, and shape summary.
5. `repository`: Morphology counts, top-level directory stats, instructions, manifests, workspace type.
6. `context`: Array of 1-ring context expansion objects per changed file.
7. `verification`: Declared repository checks and executed command logs.

---

## JSON Structure Specification

```jsonc
{
  "neatcode": {
    "envelope": 1,                     // Integer: schema version (always 1)
    "generated": "string (ISO 8601)"   // Timestamp of assembly
  },
  "scope": {
    "verb": "string",                  // "review" | "audit" | "restructure" | "study" | "harden" | "build"
    "mode": "string",                  // "working-tree" | "staged" | "commit" | "range" | "patch" | "paths" | "repository"
    "describe": "string",              // Human-readable description of the scope
    "base": "string | null",           // Commit SHA of the comparison base
    "head": "string | null",           // Commit SHA of the comparison head
    "paths": ["string"]                // Array of path strings when mode="paths"
  },
  "intent": "string | null",           // The user-supplied intent statement
  "change": {
    "summary": {
      "files": 0,                      // Integer: number of modified files
      "additions": 0,                  // Integer: total lines added
      "deletions": 0,                  // Integer: total lines deleted
      "directories": 0,                // Integer: distinct directory count
      "byKind": {
        "source": 0,                   // Counts grouped by classifyPath()
        "test": 0,
        "docs": 0,
        "config": 0,
        "asset": 0,
        "generated": 0
      },
      "byStatus": {
        "added": 0,
        "modified": 0,
        "deleted": 0,
        "renamed": 0,
        "copied": 0
      },
      "touchesTests": true,            // Boolean: true if byKind.test > 0
      "touchesGenerated": false        // Boolean: true if byKind.generated > 0
    },
    "files": [
      {
        "path": "string",              // Current repository-relative path
        "oldPath": "string | null",    // Prior path (for renames/copies)
        "status": "string",            // "added" | "modified" | "deleted" | "renamed" | "copied"
        "kind": "string",              // "source" | "test" | "docs" | "config" | "asset" | "generated"
        "binary": false,               // Boolean: true if binary file
        "additions": 0,                // Integer: lines added in this file
        "deletions": 0,                // Integer: lines deleted in this file
        "hunks": [
          {
            "oldStart": 0,             // Integer: original file line offset
            "oldLines": 0,             // Integer: original line count
            "newStart": 0,             // Integer: new file line offset
            "newLines": 0,             // Integer: new line count
            "section": "string"        // Function or section heading from hunk header
          }
        ]
      }
    ],
    "diff": "string",                  // Unified diff text (or truncated chunk)
    "diffTruncated": false,            // Boolean: true if raw diff exceeded maxDiffBytes
    "diffBytes": 0                     // Integer: byte size of untruncated diff
  },
  "repository": {
    "root": "string",                  // Absolute filesystem path to repo root
    "branch": "string | null",         // Current Git branch name (null if detached)
    "head": "string | null",           // Current HEAD commit SHA
    "cleanWorkingTree": true,          // Boolean: true if porcelain status is empty
    "dirtyPaths": ["string"],          // Array of paths modified in working tree
    "tree": {
      "fileCount": 0,                  // Total tracked files in repository
      "counts": { "source": 0, "test": 0, "docs": 0, "config": 0, "generated": 0 },
      "directories": [                 // Directory counts up to depth 3
        { "path": "string", "files": 0, "kinds": {} }
      ],
      "topLevel": [                    // Top-level root directories
        { "path": "string", "files": 0 }
      ]
    },
    "manifests": ["string"],           // Discovered package manifests (package.json, etc.)
    "instructions": ["string"],        // Discovered instructions (AGENTS.md, etc.)
    "architectureDocs": ["string"],    // Discovered architecture docs (README.md, ADRs)
    "workspace": {
      "markers": ["string"],           // Discovered workspace config files
      "packageCount": 1,               // Number of discovered packages
      "monorepo": false                // Boolean: true if packageCount > 1
    },
    "sizeOutliers": [                  // Up to 12 largest non-generated files
      { "path": "string", "bytes": 0 }
    ]
  },
  "context": [
    {
      "path": "string",                // File for which context is expanded
      "generated": false,              // Boolean: true if file is generated
      "package": {                     // Enclosing package
        "dir": "string",
        "manifest": "string"
      } | null,
      "imports": ["string"],           // Local relative file paths imported by this file
      "callers": ["string"],           // Files containing textual mentions of this module stem
      "tests": ["string"]              // Test files matching module name
    }
  ],
  "verification": {
    "declared": [
      {
        "source": "string",            // Manifest declaring the check (e.g. "package.json")
        "command": "string"            // Shell command (e.g. "npm run test")
      }
    ],
    "ran": [
      {
        "command": "string",           // Executed shell command
        "ran": true,                   // Boolean: true if process spawned
        "status": "string",            // "passed" | "failed" | "timeout" | "not-run"
        "exitCode": 0 | null,          // Integer process exit code
        "durationMs": 0,               // Integer execution time in milliseconds
        "summary": "string"            // Condensed stdout/stderr output
      }
    ]
  }
}
```

---

## Validation Invariants (`validateEnvelope`)

[`validateEnvelope()`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/lib/envelope.mjs#L118-L159) enforces the following rules:
1. `envelope.neatcode.envelope === 1`.
2. `envelope.scope.mode` must be in `SCOPE_MODES`.
3. `envelope.repository.root` must be a non-empty string.
4. `envelope.change.files` must be an array.
5. Each file must have a valid `status` (`added`, `modified`, `deleted`, `renamed`, `copied`).
6. If the scope is diff-bearing (`working-tree`, `staged`, `commit`, `range`, `patch`) and `diff` contains non-whitespace text, `files` must not be empty.
7. If `diffTruncated` is true, `diffBytes` must be populated.
8. Every check in `verification.ran` must have `ran: boolean` and a valid status (`passed`, `failed`, `timeout`, `not-run`).
9. Every context ring entry must specify `path`.
