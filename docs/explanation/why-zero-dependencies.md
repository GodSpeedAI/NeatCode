# Explanation: Why Zero Runtime Dependencies?

A distinctive property of the NeatCode repository is that its `package.json` contains **zero runtime dependencies** (`"dependencies": {}`) and zero development dependencies.

This document explains the technical rationale, constraints, and trade-offs behind this decision.

---

## The Principle: Practice What You Preach

NeatCode's core quality rule is **Restraint**:
> *"What concrete constraint earns this complexity?"* ([`references/restraint.md`](../../skills/neatcode/references/restraint.md))

A tool that instructs software engineers to reject unearned dependencies, avoid bloated wrappers, and audit external supply chains cannot reasonably ship with 400 transitively-installed npm packages to parse a unified diff. 

If NeatCode required `commander`, `chalk`, `globby`, `simple-git`, and `diff2html` to assemble a change envelope, it would violate the very discipline it exists to teach.

---

## Technical Feasibility with Modern Node.js

Historically, Node.js CLI tools pulled in large third-party trees because the runtime lacked basic primitives. In modern Node.js ($\ge 20$), the standard library provides everything required for NeatCode's mission:

1. **Subprocess Execution**: `node:child_process` (`spawnSync`) executes Git queries and verification commands safely without third-party Git wrappers.
2. **Filesystem Traversal**: `node:fs` provides synchronous, high-performance file reading and directory traversal without needing `glob` or `fast-glob`.
3. **Path Handling**: `node:path` handles cross-platform path resolution and normalization.
4. **Test Runner**: Node's built-in `node:test` and `node:assert/strict` eliminate the need for Jest, Mocha, or Vitest.

---

## Trade-offs and Rejected Alternatives

### 1. Rejection of `simple-git` or isomorphic Git libraries
- **Trade-off**: NeatCode requires the user to have the native `git` CLI installed on their machine.
- **Rationale**: Any developer or CI environment using NeatCode already has Git installed. Spawning native Git directly guarantees 100% fidelity with the user's actual configuration, `.gitattributes`, credential helpers, and repository state. It eliminates thousands of lines of JavaScript Git reimplementation.

### 2. Rejection of Parser Generators (e.g. Babel, Tree-sitter)
- **Trade-off**: Context expansion (`lib/context.mjs`) uses targeted regular expressions rather than an exact AST parser.
- **Rationale**: An AST parser requires compiled native binaries (Tree-sitter) or massive language-specific AST packages that break across different ECMAScript, TypeScript, Python, or Rust versions. NeatCode's textual heuristics are fast, transparent, zero-install, and explicitly honest about being approximations.

### 3. Rejection of CLI Frameworks (`commander`, `yargs`)
- **Trade-off**: Hand-crafted argument parsing (`bin/neatcode.mjs:parseArgs`).
- **Rationale**: NeatCode has two subcommands (`envelope` and `checks`) and a dozen flags. A 40-line `switch` statement handles this completely in under 2 milliseconds of startup time.

---

## Consequences

- **Instant Startup**: `neatcode envelope` starts and completes in milliseconds; there is no module-resolution latency across thousands of `node_modules` files.
- **Infinite Portability**: The package installs anywhere Node $\ge 20$ is present, even in locked-down corporate enterprise networks without external internet access or npm proxy permissions.
- **Zero Supply-Chain Risk**: NeatCode introduces zero transitive vulnerability vectors (CVEs) or supply-chain poisoning risks into the host development environment.
