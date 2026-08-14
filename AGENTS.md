# AGENTS.md — working in this repository

This file is for coding agents making changes **to NeatCode itself** (the harness, the
skill definition, its references, tests). It has nothing to do with what the `neatcode`
skill teaches an agent to do in *other* repositories — that content lives in
[`skills/neatcode/SKILL.md`](skills/neatcode/SKILL.md).

## What this repo is

A Claude Code / Cursor / Codex skill plus a small Node CLI harness:

- `skills/neatcode/SKILL.md` — the skill definition. `skills/neatcode/references/` — the
  reference files it loads conditionally. Read [`SKILL.md`](skills/neatcode/SKILL.md)
  itself before editing anything under `references/`; the loading rules at the bottom of
  the skill file define when each reference is read, and a reference that isn't reachable
  from that map is dead weight.
- `bin/neatcode.mjs` — the CLI entry point (`neatcode envelope`, `neatcode checks`). It
  only *acquires and structures* a change envelope; it never judges one. Judgment is the
  skill's job, not the harness's — keep that boundary when touching either.
- `lib/` — the harness implementation: `envelope.mjs`, `diff.mjs`, `git.mjs`, `repo.mjs`,
  `context.mjs`, `verify.mjs`.
- `test/` — `node --test` specs, including `skill-integrity.test.mjs`, which checks that
  `SKILL.md`'s reference links actually resolve to files on disk. Any rename or removal
  under `skills/neatcode/references/` must keep that test passing.
- `site/` — the static docs site (served via `npm run serve`, deployed per `vercel.json`).
  Not part of the skill or CLI; treat it as its own concern.

## Commands

```bash
npm test                                          # node --test, runs everything in test/
node bin/neatcode.mjs --help                      # CLI usage
node bin/neatcode.mjs envelope --staged --verb review
npm run serve                                      # docs site on :4173
```

No build step and no lint script beyond what `npm test` runs — Node's built-in test
runner is the only gate. Node >= 20 (see `engines` in `package.json`).

## Conventions

- ESM throughout (`"type": "module"`); the CLI and `lib/` files use `.mjs`.
- `bin/neatcode.mjs` stays a thin argument-parsing and I/O layer over `lib/`. Put logic in
  `lib/`, not in the CLI file.
- Prose in `skills/neatcode/SKILL.md` and `references/` is the product — the same
  restraint and evidence disciplines it asks of the code it reviews apply to editing it.
  Don't add a reference file, a verb, or a rule without a concrete failure it prevents.
- Keep `references/*.md` link targets correct — `skill-integrity.test.mjs` enforces this;
  run `npm test` after moving or renaming anything under `skills/neatcode/`.

## Before committing

- `npm test` must pass.
- If you changed `skills/neatcode/SKILL.md` or anything it links to, re-check the
  reference-loading table at the bottom of `SKILL.md` still matches what actually exists.
- Don't commit machine-local or user-specific tool configuration into this file or
  `CLAUDE.md` — both ship with the published plugin and are read by everyone who installs
  it, not just your own setup.
