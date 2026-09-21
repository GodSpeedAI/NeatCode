# Subsystem: Environment Capability Inventory

The **Environment Capability Inventory** subsystem provides deterministic, structured discovery of local developer and AI agent capabilities. Implemented in [`lib/env/`](../../lib/env/), it catalogs installed coding agents, identifies the current executor, audits configured MCP services (with strict secret redaction), discovers skill directories, and inventories local toolchains.

---

## Purpose
AI coding agents frequently formulate implementation strategies requiring external tools (e.g. specialized parsers, CLI utilities, test runners, or MCP servers) that may or may not exist on the host machine. The environment inventory answers *"what tools and capabilities are actually available here?"* so the agent can select feasible strategies without guessing or leaking sensitive tokens.

---

## Responsibilities
- **Agent Discovery**: Catalogs 79 known AI coding agents adapted from upstream registry definitions, deriving a 4-state lifecycle status for each.
- **Active Executor Detection**: Identifies the currently running AI agent from runtime environment signals.
- **MCP Service Auditing**: Parses configuration files across 8+ client ecosystems, classifies transport mechanisms, and deduplicates servers configured in multiple clients.
- **Strict Secret Redaction**: Eliminates API keys, credentials, tokens, and basic-auth userinfo from configs before serializing.
- **Skill Roots Discovery**: Locates universal and client-specific agent skill directories with symlink/target deduplication.
- **Toolchain Probing**: Detects runtimes (Node, Python, Go, Rust, etc.), compilers, and checks guard engine runnability.

---

## Non-Responsibilities
- **Does not leak environment secrets**: Single-authority redaction ensures private tokens never enter agent context.
- **Does not execute agent workflows**: Purely inspects and reports configuration state.
- **Does not modify local configurations**: Operations are strictly read-only.

---

## Position in the System

```mermaid
graph TD
    CLI["CLI (bin/neatcode.mjs)<br/>neatcode environment [options]"] --> EnvMod["lib/env/index.mjs<br/>(collectEnvironment, formatHuman)"]
    
    EnvMod --> Detect["lib/env/detect.mjs<br/>(discoverAgents, deriveStatus)"]
    Detect --> Registry["lib/env/registry.mjs<br/>(AGENT_KNOWLEDGE)"]
    Detect --> Upstream["lib/env/upstream-agents.mjs<br/>(79 Agents Port)"]
    
    EnvMod --> Executor["lib/env/executor.mjs<br/>(determineExecutor)"]
    Executor --> DetectJSON["lib/env/upstream/detect-agents.json<br/>(Env-Signal Rules)"]
    
    EnvMod --> Services["lib/env/services.mjs<br/>(discoverServices, parseTomlSubset)"]
    Services --> Redact["lib/env/redact.mjs<br/>(redactConfig, redactScalar)"]
    
    EnvMod --> Skills["lib/env/skills.mjs<br/>(discoverSkills)"]
    EnvMod --> Tools["lib/env/tools.mjs<br/>(discoverTools)"]
    
    EnvMod --> Out[("Environment Inventory Output<br/>(Human text or JSON)")]
    Out --> SkillKernel["SKILL.md / references/environment.md<br/>(Strategy Formulation)"]
```

---

## Core Abstractions

### 1. Agent Discovery and Status Matrix (`lib/env/detect.mjs`)
Agents are tracked through a mechanical port of upstream agent registry data ([`lib/env/upstream-agents.mjs`](../../lib/env/upstream-agents.mjs)) and curated knowledge ([`lib/env/registry.mjs`](../../lib/env/registry.mjs)). Each agent is assigned one of four mutually exclusive statuses:

| Status | Meaning | Criteria |
| :--- | :--- | :--- |
| `active` | Currently running | Matches the active executor detected by runtime environment signals. |
| `runnable` | Executable on PATH | The agent CLI binary is found on system `PATH`. |
| `configured` | Traces or configs present | Global or project configuration files exist on disk, but binary is not on PATH. |
| `candidate` | Known but absent | Registered agent with no local binaries or configurations discovered. |

### 2. Active Executor Detection (`lib/env/executor.mjs`)
Uses a declarative signal matrix adapted from `vercel/detect-agent`:
- Checks high-priority environment overrides (`AI_AGENT`).
- Evaluates environment variable presence (e.g. `CLAUDE_CODE_ENTRYPOINT`, `CURSOR_PROJECT_DIR`, `CODEX_ENV`).
- Emits confident executor identification without false positives.

### 3. Agent Services / MCP Discovery (`lib/env/services.mjs`)
Discovers Model Context Protocol (MCP) server configurations across multiple clients:
- **Supported Clients**: Claude Code, Cursor, Codex (TOML), Zed, Roo Code, OpenCode, Cline, Windsurf.
- **Transport Classification**:
  - `stdio`: Local command execution (executable binary and argument list).
  - `remote`: SSE, HTTP, or WebSocket endpoints.
  - `incomplete`: Malformed or incomplete configurations.
- **Client Deduplication**: When the same MCP server is declared in multiple client configs, the entries are merged, preserving multi-client provenance.

### 4. Secret Redaction Engine (`lib/env/redact.mjs`)
Acts as the **single authority** for secret protection:
- Redacts sensitive keys matching common patterns (`*KEY*`, `*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*AUTH*`).
- Redacts sensitive value shapes (JWTs, Bearer tokens, GitHub/OpenAI token patterns).
- Strips username and password components from remote URLs (e.g. `https://user:pass@service.internal` becomes `https://service.internal`).
- Replaces values with placeholder indicators (e.g. `[REDACTED: Bearer ...]`) or environment variable references (`${API_KEY}`).

### 5. Skills Roots & Developer Toolchains (`lib/env/skills.mjs`, `lib/env/tools.mjs`)
- **Skills**: Scans universal directories (`~/.agents/skills`, `.agents/skills`) and client-specific folders (`~/.claude/skills`, `~/.codex/skills`, etc.). Resolves filesystem symlinks and normalizes directory targets so shared roots are counted only once.
- **Toolchains**: Detects presence and executable paths for core tools (`node`, `git`, `python3`, `cargo`, `go`, `make`, etc.) and determines whether guard engines can execute.

---

## CLI Usage

Run standalone via the `neatcode environment` command:

```bash
# Complete inventory in human-readable format
neatcode environment

# Show only configured MCP services (secrets redacted)
neatcode environment --services

# Show only installed agents and active executor
neatcode environment --agents

# Show only developer toolchains and skill roots
neatcode environment --tools

# Output structured JSON for automation
neatcode environment --json
```

---

## Skill Integration (`references/environment.md`)

When an agent is determining how to implement a complex task (e.g., whether to use a local toolchain or delegate to a configured MCP tool), it consults [`skills/neatcode/references/environment.md`](../../skills/neatcode/references/environment.md):
- **Orientation**: Step 0 of the default flow recommends running `neatcode environment` if the implementation strategy depends on machine capabilities.
- **Proportionality**: The inventory is consulted to avoid speculating about unavailable tools or hallucinating nonexistent server integrations.

---

## Robustness & Error Isolation
- **Fault-Tolerant Parsing**: Malformed configuration files, JSON syntax errors, or unparseable TOML do not crash the inventory; errors are captured in `*_error` attributes.
- **Always Exits 0**: `neatcode environment` returns exit code `0` upon completing discovery, ensuring diagnostics never block developer scripts.
