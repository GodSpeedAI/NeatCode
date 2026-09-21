# Upstream provenance — JavaScript/TypeScript guards

- Upstream repository: https://github.com/dmmulroy/anti-slop
- Source commit SHA: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (HEAD on 2026-09-20)
- License: MIT, Copyright (c) 2026 Dillon Mulroy (see `LICENSE` in this directory)
- Date integrated: 2026-09-20
- Integrated by: GodSpeedAI/NeatCode

## Files copied (verbatim into `upstream/`)

- `src/index.ts` → `upstream/index.ts` (rule registry; reference only)
- `src/rules/*.ts` except `*.test.ts` → `upstream/rules/` (18 rule implementations)
- `src/shared/*.ts` → `upstream/shared/` (scope, type-alias, array-method helpers)
- `src/effect/rules/*.ts` except `*.test.ts` → `upstream/effect-rules/`
- `package.json` → `upstream/package.json` (version/dependency record)

Omitted: `*.test.ts` files, `src/vendor/`, `skills/`, `scripts/`, lockfiles.

## NeatCode modifications

The upstream analyzers are oxlint plugins requiring the `@oxlint/plugins`
runtime with full TypeScript AST and scope resolution. NeatCode's harness is
zero-dependency by design, so the vendored sources are **reference, not
executed code**. The runnable implementation is
`lib/guards/javascript.mjs`: dependency-free syntactic detectors implementing
the same rule contracts over comment/string-masked source.

## Intentional deviations

- `require-readable-spacing` not ported: pure formatting; NeatCode leaves
  style to style tools.
- `no-array-filter-map`, `no-reduce-accumulator-copy` not ported:
  performance idioms, not evidence loss.
- `no-conditional-empty-object-spread` not ported: harmless idiom.
- `effect/*` rules not ported: specific to the Effect library.
- `no-object-parameters`: literal `object` keyword only; upstream resolves
  aliases through scope analysis.
- `no-widen-then-assert`: same-function `const` flows with syntactically known
  initializers only; cross-function and reassigned bindings stay with the skill.
- `no-runtime-typeof`: only `typeof` checks on operands explicitly widened in
  the same function (recovering discarded evidence). General typeof-narrowing
  of parameters or unknown input is idiomatic TypeScript; flagging it from
  syntax alone produced only false positives on NeatCode's own codebase, so it
  stays with the skill.
- `require-safety-comment-for-type-assertion`: `SAFETY:` marker on the
  assertion line or within the 5 lines above; upstream walks the AST owner chain.

Rule mapping (NeatCode rule → upstream rule) is recorded per finding in the
`upstream_rule_id` field.
