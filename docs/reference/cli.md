# Reference: NeatCode CLI

This document is the formal reference specification for the `neatcode` command-line executable (`bin/neatcode.mjs`).

---

## Synopsis

```bash
neatcode envelope [scope] [options]
neatcode checks
neatcode --version | -v
neatcode --help | -h
```

---

## Subcommands

### `envelope`
Assembles and outputs a structured Change Envelope. Reads Git diffs, analyzes repository morphology, resolves one-ring context expansion, executes verification checks, and outputs validated Markdown or JSON.

### `checks`
Discovers and lists verification commands declared by the target repository without executing them. Probes `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, and `Makefile`.

---

## Scope Flags (`envelope` Subcommand)

Specify **at most one** scope flag. If omitted, the default is `--working-tree`.

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `--working-tree` | None | Uncommitted changes in the working tree vs `HEAD`. | Default |
| `--staged`, `--cached` | None | Staged changes in the Git index vs `HEAD`. | — |
| `--commit` | `<rev>` | Inspects a single commit revision (diff against `<rev>^`). | — |
| `--range` | `<a..b>` or `<a...b>` | Compares revisions. `a..b` linear commit range; `a...b` symmetric merge-base comparison. | — |
| `--patch` | `<file>` | Reads a unified diff from a local patch file on disk. | — |
| `--stdin` | None | Reads unified diff text directly from standard input descriptor `0`. | — |
| `--paths` | `<p> [p...]` | Evaluates named files or directories without a diff (used for `audit`). | — |
| `--repo`, `--repository` | None | Evaluates the entire repository tree without a diff (used for `audit` / `study`). | — |

---

## General Options

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `--verb` | `<name>` | Sets target verb: `review`, `audit`, `restructure`, `study`, `harden`, `build`. | `review` |
| `--intent` | `<text>` | Declares the requested outcome in the user's words. | `null` |
| `--verify` | `<command>` | Executes a verification command in a subprocess and records the result. (Repeatable). | `[]` |
| `--json` | None | Emits raw JSON (Envelope Schema v1) instead of Markdown. | `false` |
| `--strict` | None | Exits with status `1` if structural validation errors are detected in the envelope. | `false` |
| `--max-diff-bytes` | `<n>` | Maximum byte length before the embedded unified diff is truncated. | `400000` |
| `--help`, `-h` | None | Prints CLI usage documentation and exits `0`. | — |
| `--version`, `-v` | None | Prints the CLI version string (`1.0.0`) and exits `0`. | — |

---

## Exit Codes

| Code | Name | Meaning |
| :---: | :--- | :--- |
| `0` | Success | Normal execution; envelope or check list emitted successfully. |
| `1` | Failure | Subprocess failure, `GitError`, unhandled exception, or `--strict` schema validation problem. |
| `2` | Usage Error | Invalid syntax, unknown CLI option, or missing required parameter value. |

---

## Examples

### Review Staged Changes with Test Verification
```bash
neatcode envelope --staged --verb review --verify "npm test"
```

### Review a Feature Branch Against Main
```bash
neatcode envelope --range main...HEAD --verb review
```

### Audit a Specific Subsystem
```bash
neatcode envelope --paths src/billing --verb audit
```

### Study Whole Repository and Emit JSON
```bash
neatcode envelope --repo --verb study --json
```

### Discover What the Repository Considers Proof
```bash
neatcode checks
```

---

## Source Trail
- [`bin/neatcode.mjs:1-157`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/bin/neatcode.mjs#L1-L157) — Command-line interface source implementation.
- [`lib/envelope.mjs:19-21`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/lib/envelope.mjs#L19-L21) — Permitted scope modes (`SCOPE_MODES`).
- [`test/envelope.test.mjs:159-181`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/test/envelope.test.mjs#L159-L181) — Automated CLI invocation test specs.
