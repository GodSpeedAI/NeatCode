# How-To: Inventory Agent Environment Capabilities

This guide demonstrates how to audit your local developer and AI coding agent environment using `neatcode environment`.

---

## 1. Quick Overview

To inspect the full machine capability inventory in human-readable format:

```bash
neatcode environment
```

**What is reported:**
1. **Executor**: The currently running agent (e.g. Claude Code, Cursor, OpenCode).
2. **Agents**: Installed and configured coding assistants.
3. **Services**: Configured MCP servers (with API keys and secrets fully redacted).
4. **Skills**: Available agent skill root directories.
5. **Toolchains**: Development compilers and runtimes available on system `PATH`.

---

## 2. Auditing Configured MCP Services

To view only configured Model Context Protocol (MCP) services across all local clients:

```bash
neatcode environment --services
```

**Example output:**
```text
Agent Services (MCP)
  github (stdio: npx -y @modelcontextprotocol/server-github)
    clients: claude-code, cursor
    env: GITHUB_PERSONAL_ACCESS_TOKEN=[REDACTED]
  postgres (remote: https://mcp.internal.net/sse)
    clients: codex
    headers: Authorization=[REDACTED: Bearer ...]
```

All credentials, tokens, and authorization headers are automatically scrubbed by [`lib/env/redact.mjs`](../../lib/env/redact.mjs).

---

## 3. Checking Installed Agents

To verify which coding assistants are runnable or configured on your system:

```bash
neatcode environment --agents
```

Each agent is classified into `active`, `runnable`, `configured`, or `candidate`.

---

## 4. Checking Toolchains and Skills

To verify toolchain availability before implementing code:

```bash
neatcode environment --tools
```

Displays detected runtimes (`node`, `python3`, `go`, `cargo`) and confirms whether the guard engines are runnable in the current environment.

---

## 5. Machine-Readable JSON for Scripts

For programmatic inspection or integration into custom agent scripts:

```bash
neatcode environment --json
```

---

## Related Documentation
- [`docs/subsystems/environment-inventory.md`](../subsystems/environment-inventory.md) — Architectural specification.
- [`docs/reference/cli.md`](../reference/cli.md) — CLI syntax and flag reference.
- [`skills/neatcode/references/environment.md`](../../skills/neatcode/references/environment.md) — How the skill kernel uses the inventory during orientation.
