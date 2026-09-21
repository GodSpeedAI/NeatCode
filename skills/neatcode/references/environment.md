# Machine environment inventory

`neatcode environment` reports what agentic and development capabilities are
actually available on this machine and in this repository: installed coding
agents, the current executor, configured agent services (MCP), skill roots,
and developer toolchains. It is deterministic inspection, not advice.

## When to consult it

During **orientation** (Step 0), when the task's implementation strategy
depends on what exists locally:

- Before recommending or creating a parser, lint mechanism, MCP bridge,
  one-off automation, agent wrapper, or tool integration — check whether an
  installed capability already does the job. Prefer demonstrated local
  capability over invented machinery.
- Before choosing verification commands — `neatcode environment --tools`
  shows which runtimes exist and what the repository declares.
- When a result depends on the executor (paths, config locations, skill
  installation targets) — the inventory distinguishes the **current
  executor** from merely **installed** agents.

Do not consult it for trivial tasks where it adds no information, and do not
paste the whole inventory into every response. One clause in the orientation
block is enough (`Environment: cargo + python3 available; Codex active`).

## Reading the statuses

- `active` — the current executor, runnable or installed here.
- `runnable` — executable found on PATH. Capability is demonstrated.
- `installed` — the agent's own config-presence probe hit, but no executable
  was found (e.g. an IDE agent without its CLI on PATH).
- `configured` — config or skills traces exist without a positive probe.
- `candidate` — only project-level traces exist: the project expects the
  agent, this machine shows no global evidence.
- `absent` — nothing found.

A stale config directory is never presented as proof of runnability; a
binary with no config is still discoverable. Trust the evidence fields
(`executable_path`, `version`, `config_paths`), not the bare status word.

## Services and secrets

The service inventory normalizes MCP servers across clients (`configured_by`,
per-client `source_configs`), deduplicating the same logical service. Secret
values never appear — only names (`credential_variables`,
`credentials_present`). If you need a service's actual secret, that is
outside NeatCode: ask the user, never go looking through credential files.

## Earnednness reinforcement

The inventory exists to strengthen the earnedness discipline, not to bypass
it. "Tool X is installed" earns *considering* X; it does not earn adding X
to the repository, wrapping X in a new abstraction, or recommending X over
the canonical path the codebase already uses. A capability's presence is one
constraint among others — authority, boundaries, and the existing profile
still decide.
