# Reference: NeatCode CLI

This document is the formal reference specification for the `neatcode` command-line executable (`bin/neatcode.mjs`).

---

## Synopsis

```bash
neatcode envelope [scope] [options]
neatcode checks
neatcode guard [options]
neatcode environment [options]
neatcode update [options]
neatcode doctor [options]
neatcode --version | -v
neatcode --help | -h
```

---

## Subcommands

### `envelope`
Assembles and outputs a structured Change Envelope. Reads Git diffs, analyzes repository morphology, resolves one-ring context expansion, executes verification checks, and outputs validated Markdown or JSON.

### `checks`
Discovers and lists verification commands declared by the target repository without executing them. Probes `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, and `Makefile`.

### `guard`
Runs deterministic anti-slop analysis over JavaScript/TypeScript, Python, Go, and Rust files and outputs normalized findings. Languages are auto-detected from file extensions; `--language` restricts the run. Findings are output, not failure: exit `0` means the scan completed. Exit `1` means the run itself failed (missing runtime, unreadable file, analyzer crash) or `--strict` tripped on findings. Vendored guard reference sources (`guards/*/upstream/`) and generated/vendor/build directories are excluded unless `--all` is given.

### `environment`
Reports the machine capability inventory: installed coding agents, the current executor, configured agent services (MCP, secrets redacted), skill roots, and developer toolchains. Discovery never fails the command; per-section errors are carried in `*_error` fields. Always exits `0` on a completed inventory.

### `update`
Resolves eligible releases and updates the complete managed installation. Enforces the 24-hour soak policy, synchronizes canonical managed skills, and reconciles all active agent exposure points without overwriting locally modified files.

### `doctor`
Diagnoses NeatCode distribution coherence, CLI integrity, deterministic guards, reference link integrity, agent exposure states, and available releases.

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
| `--guards` | None | Includes deterministic guard evidence for the changed paths (baseline `HEAD` for diff scopes). Opt-in; ordinary envelopes stay cheap. | `false` |
| `--json` | None | Emits raw JSON (Envelope Schema v1) instead of Markdown. | `false` |
| `--strict` | None | Exits with status `1` if structural validation errors are detected in the envelope. | `false` |
| `--max-diff-bytes` | `<n>` | Maximum byte length before the embedded unified diff is truncated. | `400000` |
| `--help`, `-h` | None | Prints CLI usage documentation and exits `0`. | — |
| `--version`, `-v` | None | Prints the CLI version string (`1.0.0`) and exits `0`. | — |

---

## Guard Options (`guard` Subcommand)

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `--paths` | `<p> [p...]` | Files or directories to scan. | tracked files |
| `--language` | `<name>` | `javascript` \| `typescript` \| `python` \| `go` \| `rust`. (Repeatable). | all detected |
| `--staged` | None | Label findings against the staged diff (baseline `HEAD`). | `false` |
| `--baseline` | `<rev>` | Label findings against the working tree vs `<rev>`. | none |
| `--all` | None | Include generated files and vendored guard sources. | `false` |
| `--json` | None | Emit the stable guard-result JSON instead of text. | `false` |
| `--strict` | None | Exit `1` when any finding exists. | `false` |

## Environment Options (`environment` Subcommand)

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `--agents` | None | Show only the agent inventory. | all sections |
| `--services` | None | Show only the agent-service (MCP) inventory. | all sections |
| `--tools` | None | Show only toolchains and skill roots. | all sections |
| `--json` | None | Emit the stable inventory JSON instead of text. | `false` |

## Update Options (`update` Subcommand)

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `--check` | None | Read-only check for updates and installation drift without modifying disk. | `false` |
| `--yes`, `-y` | None | Noninteractive confirmation for safe updates in automation. | `false` |
| `--force` | None | Permit installation of a release still inside the 24-hour soak window. | `false` |
| `--repair` | None | Reconcile drifted managed skills to the installed NeatCode distribution. | `false` |
| `--json` | None | Emit update candidate payload JSON instead of formatted text. | `false` |

## Doctor Options (`doctor` Subcommand)

| Flag | Argument | Description | Default |
| :--- | :--- | :--- | :--- |
| `--json` | None | Emit diagnostic report JSON instead of formatted text. | `false` |

## Exit Codes

| Code | Name | Meaning |
| :---: | :--- | :--- |
| `0` | Success | Normal execution; envelope, check list, guard result, or inventory emitted successfully. Guard findings are output, not failure. |
| `1` | Failure | Subprocess failure, `GitError`, unhandled exception, `--strict` schema validation problem, incomplete guard run (missing runtime, unreadable file), or `--strict` guard findings. |
| `2` | Usage Error | Invalid syntax, unknown CLI option/command, or missing required parameter value. |

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

### Scan Staged Changes with Deterministic Guards
```bash
neatcode guard --staged
```

### Scan One Language as JSON
```bash
neatcode guard --paths src --language rust --json
```

### Inventory Installed Agents and Toolchains
```bash
neatcode environment --agents
```

### Check for Updates and Soak State
```bash
neatcode update --check
```

### Force Early Installation of a Soaking Release
```bash
neatcode update --force
```

### Reconcile Drifted Installations
```bash
neatcode update --repair
```

### Diagnose System Coherence
```bash
neatcode doctor
```

---

## Source Trail
- [`bin/neatcode.mjs:1-157`](../../bin/neatcode.mjs#L1-L157) — Command-line interface source implementation.
- [`lib/envelope.mjs:19-21`](../../lib/envelope.mjs#L19-L21) — Permitted scope modes (`SCOPE_MODES`).
- [`test/envelope.test.mjs:159-181`](../../test/envelope.test.mjs#L159-L181) — Automated CLI invocation test specs.
