# Third-party notices

NeatCode is derived from Hallmark and vendors or adapts several
open-source implementations for its deterministic subsystems. This file
records each source, its license, and what NeatCode took from it. Full
license texts live beside the vendored code; per-subsystem provenance
(including exact commit SHAs, copied files, and intentional deviations)
lives in the `UPSTREAM.md` files referenced below.

NeatCode's own code is MIT — see `LICENSE`. Nothing here replaces any
upstream copyright notice with GodSpeedAI; originals are retained wherever
substantial code was copied.

## Hallmark (skill architecture)

- Source: https://github.com/Nutlope/hallmark
- License: MIT (notice retained in `LICENSE`)
- Used for: the natural-language skill architecture (kernel, progressive
  references, verb dispatch, pre-emit critique, gates). Subject matter
  replaced entirely: design judgment → software-engineering judgment.

## dmmulroy/anti-slop (JS/TS guard rules)

- Source: https://github.com/dmmulroy/anti-slop
- License: MIT, Copyright (c) 2026 Dillon Mulroy
- Vendored (reference): `guards/js-ts/upstream/` — see `guards/js-ts/UPSTREAM.md`
- Full text: `guards/js-ts/LICENSE`
- Used for: rule contracts adapted into NeatCode's dependency-free
  `lib/guards/javascript.mjs` detectors. The oxlint-plugin sources are not
  executed by NeatCode.

## zaterka/anti-slop-python (Python guard engine)

- Source: https://github.com/zaterka/anti-slop-python
- License: MIT, Copyright (c) 2026 Pedro Zaterka
- Vendored (executed): `guards/python/upstream/anti_slop/` — see
  `guards/python/UPSTREAM.md`
- Full text: `guards/python/LICENSE`
- Used for: executed directly via the system `python3` (`--format json`);
  findings normalized by `lib/guards/python.mjs`.

## JacobJNilsson/anti-slop-go (Go guard rules)

- Source: https://github.com/JacobJNilsson/anti-slop-go
- License: MIT, Copyright (c) 2026 Jacob Nilsson
- Vendored (reference): `guards/go/upstream/` — see `guards/go/UPSTREAM.md`
- Full text: `guards/go/LICENSE`
- Used for: rule contracts (G01–G08, G10, G11, G13) adapted into NeatCode's
  dependency-free `lib/guards/go.mjs` detectors. The `go/analysis` passes are
  not executed by NeatCode.

## styrene-lab/lipstyk (Rust reference)

- Source: https://github.com/styrene-lab/lipstyk
- License: MIT, Copyright (c) 2026 Styrene Lab
- Consulted only — no source copied. See `guards/rust/UPSTREAM.md`.
- Used for: Rust AST infrastructure ideas and output/integration reference.
  The Rust guard policy (`lib/guards/rust.mjs`) is NeatCode-owned; Lipstyk's
  scoring/authorship-detection framing was deliberately not adopted.

## vercel-labs/skills (agent registry)

- Source: https://github.com/vercel-labs/skills
- License: MIT, Copyright (c) 2026 Vercel, Inc.
- Vendored (reference + mechanical port): `lib/env/upstream/agents.registry.ts`
  and the generated `lib/env/upstream-agents.mjs` — see
  `lib/env/upstream/UPSTREAM.md`
- Full text: `lib/env/upstream/LICENSE.vercel-skills`
- Used for: the ~80-agent registry (skill directories, env overrides,
  config-presence probes) underlying installed-agent and skills discovery.

## vercel/detect-agent (current-executor detection)

- Source: https://github.com/vercel/detect-agent
- License: Apache-2.0, Copyright Vercel (declared in the upstream
  `package.json`; the upstream repository ships no LICENSE file)
- Vendored: `lib/env/upstream/detect-agents.json` (loaded at runtime),
  `detect-agents.schema.json`, `evaluate-condition.ts` — see
  `lib/env/upstream/UPSTREAM.md`
- Used for: environment-signal spec and condition semantics behind
  `lib/env/executor.mjs`.

  Apache-2.0 attribution: this project includes a port of vercel/detect-agent's
  condition evaluator and loads its `agents.json` specification.
  Copyright Vercel. Licensed under the Apache License, Version 2.0
  (https://www.apache.org/licenses/LICENSE-2.0).

## EnjoyableWork/mcp-sync (MCP discovery reference)

- Source: https://github.com/EnjoyableWork/mcp-sync
- License: MIT, Copyright (c) 2026 Enjoyable Work
- Consulted only — no source copied (Rust implementation). See
  `lib/env/upstream/UPSTREAM.md`.
- Used for: MCP configuration locations and server-definition shapes for
  Cursor, Codex, VS Code/Copilot, Windsurf, Kiro, and Claude Desktop.
  `lib/env/services.mjs` is NeatCode-owned.
