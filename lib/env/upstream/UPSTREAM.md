# Upstream provenance — environment discovery

## Agent registry

- Upstream repository: https://github.com/vercel-labs/skills
- Source commit SHA: `7407f3893ad4dceab546ac002c3ef806e4000c73` (HEAD on 2026-09-20)
- License: MIT, Copyright (c) 2026 Vercel, Inc. (see `LICENSE.vercel-skills` in this directory)
- Date integrated: 2026-09-20
- Integrated by: GodSpeedAI/NeatCode

Files copied (verbatim):

- `src/agents.ts` → `upstream/agents.registry.ts` (79-agent registry with
  skill directories, env overrides, and config-presence probes)

Runnable port: `lib/env/upstream-agents.mjs`, produced by a mechanical
transform (regenerate with `/tmp/port-agents.mjs`, kept outside the repo).

Deviations from upstream (re-check after any refresh):

- `xdg-basedir` dependency replaced by `XDG_CONFIG_HOME`-env-or-default
  (NeatCode keeps zero runtime dependencies).
- TypeScript types stripped; no behavioral change.
- Registry loads lazily via `loadUpstreamAgents({home, cwd})` so tests can
  inject a fake home (upstream evaluates `homedir()` at import time).
- Trailing query helpers (`detectInstalledAgents`, `getUniversalAgents`,
  …) dropped — NeatCode's `lib/env/detect.mjs` owns status derivation.
- Universal/prompt-display flags (`showInUniversalList`,
  `showInUniversalPrompt`) preserved in data, unused by NeatCode.

NeatCode-owned curation on top: `lib/env/registry.mjs` (`AGENT_KNOWLEDGE`)
adds executables, version arguments, and MCP config locations for the major
agents. Facts inherited from the upstream table are marked `registry` there.

## Current-executor detection

- Upstream repository: https://github.com/vercel/detect-agent
- Source commit SHA: `3ab1df1e4eaae153cf66f4a5018e4c5854855212` (HEAD on 2026-09-20)
- License: Apache-2.0 (per the upstream `package.json`; no LICENSE file ships
  upstream — see THIRD_PARTY_NOTICES.md)
- Date integrated: 2026-09-20

Files copied (verbatim):

- `agents.json` → `upstream/detect-agents.json` (20-agent env-signal spec;
  **loaded at runtime** by `lib/env/executor.mjs` — genuine reuse)
- `agents.schema.json` → `upstream/detect-agents.schema.json`
- `src/evaluate-condition.ts` → `upstream/evaluate-condition.ts`

`lib/env/executor.mjs` ports the condition evaluator (sync instead of async;
`~` expansion for `file_exists`). The `AI_AGENT`-first priority and
first-match-wins order are preserved.

## MCP / agent-service discovery

- Reference: https://github.com/EnjoyableWork/mcp-sync
- Consulted commit SHA: `658c66e5e841778c34468db7596d8d962212f194` (HEAD on 2026-09-20)
- License: MIT, Copyright (c) 2026 Enjoyable Work

Consulted, not vendored (a Rust sync tool; its code cannot run in NeatCode's
harness). Adapted knowledge, each marked `mcp-sync` in
`lib/env/registry.mjs`:

- Cursor `~/.cursor/mcp.json` + `.cursor/mcp.json`, `mcpServers` key
- Codex `~/.codex/config.toml` (+ workspace `.codex/`, `/etc/codex/`),
  `[mcp_servers]` tables
- VS Code `<user-data>/Code/User/mcp.json` + workspace `.vscode/mcp.json` /
  `.mcp.json`, `servers` key; Copilot CLI `~/.copilot/mcp-config.json`
- Windsurf `~/.codeium/windsurf/mcp_config.json`
- Kiro `<kiro_home>/settings/mcp.json`
- Claude Desktop `<user-data>/Claude/claude_desktop_config.json`

`lib/env/services.mjs` (JSON/JSONC parsing, TOML-subset parser,
normalization, redaction) is NeatCode-owned. Other client formats
(Claude Code, OpenCode, Gemini CLI, Zed `context_servers`, Roo Code
`mcp_settings.json` + `.roo/mcp.json`) come from stable public documentation
and are marked `public-docs`.

Deliberately uncovered (verified 2026-09-20, formats unconfirmable without
invention): Qwen Code (`~/.qwen/` carries no settings file on any inspected
machine; docs index exposes no MCP config reference), Crush (README
documents `crush.json` `mcp` for HTTP but neither the stdio shape nor file
locations), Amp/Goose/Aider (no stable documented MCP config locations
found). These stay out rather than guessed.
