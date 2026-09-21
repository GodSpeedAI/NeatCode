# Upstream provenance — Python guards

- Upstream repository: https://github.com/zaterka/anti-slop-python
- Source commit SHA: `7412073045eefffa8152ce0ac6ff9b8e6df9053a` (HEAD on 2026-09-20)
- License: MIT, Copyright (c) 2026 Pedro Zaterka (see `LICENSE` in this directory)
- Date integrated: 2026-09-20
- Integrated by: GodSpeedAI/NeatCode

## Files copied (verbatim into `upstream/`)

- `anti_slop/` (entire package: engine, CLI, config, suppressions, all rules)
  → `upstream/anti_slop/`
- `pyproject.toml` → `upstream/pyproject.toml` (version/dependency record)

Omitted: `tests/`, `skills/`, `action.yml`, lockfiles.

`__pycache__` directories are never committed.

## NeatCode modifications

None to the engine itself. The package is dependency-free stdlib-only Python,
so unlike the other three languages NeatCode **executes the vendored engine
directly** (`python3 -m anti_slop --format json`, argv array, no shell) when a
suitable runtime exists. `lib/guards/python.mjs` is a normalization adapter:

- maps each `anti-slop/*` rule to a NeatCode taxonomy family
  (see `PYTHON_FAMILY_MAP`),
- renames rules to `neatcode/py/*` while preserving `upstream_rule_id`,
- converts 0-based engine columns to the 1-based unified model,
- surfaces engine parse failures as execution failures, never as clean files.

## Intentional deviations

- Only default-enabled upstream rules run (NeatCode passes no `--select`;
  opt-in rules stay opt-in).
- Requires `python3 >= 3.12` (the engine's own floor). Older or missing
  runtimes report `not-runnable`, never `passed`.
- The engine's project configuration discovery (`pyproject.toml` /
  `anti-slop.toml` search) is left at its default behavior: a repository's
  own anti-slop configuration is respected.
