# Upstream provenance — Rust guards

- Reference repository: https://github.com/styrene-lab/lipstyk
- Consulted commit SHA: `b23b32bcdaa607e5d7b59e69228a90247adbd9dc` (HEAD on 2026-09-20)
- License: MIT, Copyright (c) 2026 Styrene Lab
- Date integrated: 2026-09-20
- Integrated by: GodSpeedAI/NeatCode

## Consulted, not vendored

No Lipstyk source is copied into this directory. Lipstyk was read as a
reference for Rust AST infrastructure (`syn`-based parsing), Rust-specific
generated-code patterns, and output/integration ideas. Its scoring and
authorship-detection framing ("slop score", density-as-signal) was
deliberately **not** adopted: NeatCode reports evidence-loss patterns, not a
machine-generated verdict.

The closest relatives consulted were `src/rules/boxed_error.rs`,
`src/rules/error_swallowing.rs`, `src/rules/unwrap_overuse.rs`, and the rule
catalog in `RULES.md`.

## NeatCode-owned policy

The runnable implementation is `lib/guards/rust.mjs`: nine NeatCode-owned
rules with no upstream rule id (`upstream_rule_id: null`,
`source: "neatcode"`):

| Rule | Family | Contract |
| ---- | ------ | -------- |
| `unsafe-without-safety-comment` | unjustified-escape-hatch | `unsafe` blocks/items need a nearby `SAFETY:` invariant |
| `transmute-without-safety-comment` | unjustified-escape-hatch | `transmute` needs a nearby `SAFETY:` layout invariant |
| `dyn-any-erasure` | evidence-erasure | `dyn Any` erases a concrete type without a recorded reason |
| `erase-then-downcast` | type-laundering | `downcast*` / `is::<T>` recover earlier-erased evidence |
| `broad-dynamic-error` | broad-untyped-contract | `Box<dyn Error>`, `anyhow::Error`, `eyre::Report` in library signatures |
| `typeid-driven-dispatch` | dynamic-dispatch | `TypeId::of` branching instead of an enum/trait contract |
| `untyped-value-escapes-boundary` | boundary-not-parsed | `serde_json::Value` in signatures, fields, aliases |
| `panic-macro-in-library` | incomplete-failure-handling | `panic!` / `todo!` / `unimplemented!` outside tests |
| `dynamic-map-domain-model` | broad-untyped-contract | `HashMap<String, Value/Any>` struct fields |

## Intentional non-goals

- `.unwrap()` / `.expect()` density: Clippy's territory; flagging it here
  would duplicate standard tooling to inflate rule count.
- Formatting, naming style, comment density: rustfmt/Clippy's territory.
- Whether a test seam should exist: needs repository judgment; left to the skill.
- `unreachable!`: too often legitimate after exhaustive matches; not flagged.
