# How-To: Run Deterministic Guards

This guide demonstrates how to run NeatCode's deterministic anti-slop guards across JavaScript/TypeScript, Python, Go, and Rust files.

---

## 1. Quick Guard Scan

To run a scan over all tracked repository files in supported languages:

```bash
neatcode guard
```

**What happens:**
- Scans JS/TS, Python, Go, and Rust files for known anti-slop patterns (type laundering, empty spreads, broad `any` parameters, unannotated `unsafe` blocks, etc.).
- Normalizes findings into standard categories.
- Exits `0` if the scan completes (findings are informational diagnostics, not harness execution errors).

---

## 2. Diff-Relative Scans (Baselined)

To evaluate only the changes you have made rather than existing legacy issues:

### Staged Changes (vs HEAD)
```bash
neatcode guard --staged
```

### Against a Branch or Revision
```bash
neatcode guard --baseline main
```

**How findings are categorized:**
- **`introduced`**: Pattern was added by your change.
- **`worsened`**: Pattern existed on this path, but occurs more frequently now.
- **`exposed`**: Pattern was untouched, but surrounding code made it active.
- **`pre-existing`**: Existed prior to your change.
- **`resolved`**: Present in the baseline but fixed by your change.

---

## 3. Targeting Specific Directories or Languages

You can restrict scans to specific subdirectories or languages to keep execution fast:

```bash
# Scan only a specific subsystem
neatcode guard --paths src/billing

# Scan only Python and TypeScript files
neatcode guard --language python --language typescript

# Combine paths and languages
neatcode guard --paths src/api --language typescript --json
```

---

## 4. Embedding Guards in Change Envelopes

To provide guard evidence directly inside the Change Envelope that your AI coding agent reviews:

```bash
neatcode envelope --staged --verb review --guards --verify "npm test"
```

The emitted envelope will include a `## Deterministic Guards` section summarizing introduced vs. pre-existing findings alongside diffs, context rings, and test verification results.

---

## 5. CI / Automated Enforcement

To enforce clean guard passes in CI pipelines or pre-commit hooks, pass `--strict`:

```bash
# Exit status 1 if any guard finding is detected
neatcode guard --staged --strict
```

If any findings exist, `neatcode guard` exits with status `1`, causing the CI pipeline step to fail.

---

## Related Documentation
- [`docs/subsystems/deterministic-guards.md`](../subsystems/deterministic-guards.md) — Architectural specification.
- [`docs/reference/cli.md`](../reference/cli.md) — Complete CLI flag reference for `neatcode guard`.
- [`skills/neatcode/references/guards.md`](../../skills/neatcode/references/guards.md) — How the skill kernel interprets guard findings.
