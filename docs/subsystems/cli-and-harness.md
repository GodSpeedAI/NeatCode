# Subsystem: CLI and Harness

The **CLI and Harness** subsystem provides the command-line boundary and execution entry point for NeatCode. It handles argument tokenization, process standard I/O streams, and delegates evidence assembly to underlying modules.

---

## Purpose
The CLI exists to provide a zero-dependency, deterministic terminal interface for acquiring repository evidence and discovering verification proof without embedding evaluation opinions.

---

## Responsibilities
- **Argument Parsing**: Tokenizes CLI flags, scope modes, verification commands, and output formats.
- **Process Orchestration**: Invokes `buildEnvelope()` or `discoverChecks()` based on user subcommands.
- **Serialization**: Emits validated Markdown or JSON envelopes to standard output.
- **Exit Code Management**: Translates execution results into standardized exit codes (`0`, `1`, `2`).

---

## Non-Responsibilities
- **Does not judge code quality**: Contains no rules determining whether a change is good or bad.
- **Does not perform Git operations directly**: Delegates all subprocess execution to [`lib/git.mjs`](../../lib/git.mjs).
- **Does not parse diffs**: Delegates diff tokenization to [`lib/diff.mjs`](../../lib/diff.mjs).

---

## Position in the System

```mermaid
graph TD
    Shell["Terminal / Operator / CI"] --> CLI["bin/neatcode.mjs"]
    CLI --> ParseArgs["parseArgs()"]
    CLI --> ReadStdin["readStdin()"]
    CLI --> EnvBuild["lib/envelope.mjs (buildEnvelope)"]
    CLI --> EnvVal["lib/envelope.mjs (validateEnvelope)"]
    CLI --> Checks["lib/verify.mjs (discoverChecks)"]
```

---

## Core Abstractions

### `parseArgs(argv)`
A custom, zero-dependency command-line argument tokenizer located at [`bin/neatcode.mjs:44-86`](../../bin/neatcode.mjs#L44-L86). It processes argv arrays sequentially and populates an options dictionary:
```javascript
const opts = {
  command: null,                       // 'envelope' | 'checks'
  source: { mode: 'working-tree', paths: [] },
  verb: 'review',                      // review | audit | restructure | study | harden | build
  intent: null,
  verify: [],                          // Array of shell commands to execute
  json: false,                         // Emit JSON vs Markdown
  strict: false,                       // Non-zero exit on envelope problems
  maxDiffBytes: undefined,
};
```

### Exit Codes
- `0`: Successful execution with valid envelope output.
- `1`: Subprocess error, unhandled exception, or strict validation failure (`--strict`).
- `2`: Command-line usage error (unknown flag, missing flag argument, invalid subcommand).

---

## Internal Operation

When invoked with `neatcode envelope [options]`:
1. `parseArgs(process.argv.slice(2))` validates all flags.
2. If `--stdin` is specified, `readStdin()` buffers file descriptor `0` via `readFileSync(0, 'utf8')`.
3. `buildEnvelope()` is called with the resolved scope and options.
4. `validateEnvelope()` performs structural sanity checks on the resulting object.
5. If problems exist, warnings are printed to `process.stderr`.
6. If `--strict` is set and problems were discovered, the process exits with code `1`.
7. The envelope is rendered as JSON (`JSON.stringify(envelope, null, 2)`) or Markdown (`toMarkdown(envelope)`) and written to `process.stdout`.

When invoked with `neatcode checks`:
1. Resolves repository root using `repoRoot(process.cwd())`.
2. Calls `discoverChecks(root)`.
3. Prints tab-delimited commands and sources (e.g. `npm run test\t(package.json)`).

---

## State
The CLI subsystem is strictly **stateless**. It reads the local filesystem and executes Git queries dynamically; it maintains no caches or persistent background state.

---

## Failure Modes
- **Unknown Option**: Throws an error (`unknown option: --foo`) and exits with code `2`.
- **Missing Required Argument**: `need(rest, flag)` detects missing parameters and exits with code `2`.
- **Validation Failure with `--strict`**: Returns exit code `1` if structural errors occur during envelope assembly.

---

## Extension Points
- **New CLI Flags**: Add flag cases in [`bin/neatcode.mjs:58-84`](../../bin/neatcode.mjs#L58-L84).
- **New Output Formats**: Extend serialization logic in [`bin/neatcode.mjs:149`](../../bin/neatcode.mjs#L149).

---

## Source Trail
- [`bin/neatcode.mjs:10-42`](../../bin/neatcode.mjs#L10-L42) — CLI version and help documentation constants.
- [`bin/neatcode.mjs:44-86`](../../bin/neatcode.mjs#L44-L86) — `parseArgs()` implementation.
- [`bin/neatcode.mjs:101-155`](../../bin/neatcode.mjs#L101-L155) — `main()` execution coordinator.
- [`test/envelope.test.mjs:159-181`](../../test/envelope.test.mjs#L159-L181) — CLI integration test specs.
