# Ecosystem overlay: Rust

Load this file when guard findings (or review evidence) implicate Rust
patterns. It turns a deterministic finding into a repository judgment.
Clippy and rustfmt own idioms; this file owns evidence and authority.

## unjustified-escape-hatch (`unsafe`, `transmute`)

A `SAFETY:` comment must state the property the author checked that makes
the operation sound — validity ("bytes are a valid `Packet`: length-checked
in `parse`"), aliasing ("exclusive `&mut` held by `Table` for the region"),
layout ("`repr(C)`, same fields, verified against the C header"), or
initialization ("every byte written before `assume_init`"). Judge the
invariant, not the keyword:

- **Accept**: `SAFETY:` naming a checkable precondition with its location
  ("checked by caller" must name *which* caller and *where*).
- **Reject**: no comment, or a comment restating the operation
  ("transmute u32 to f32" says what, never why it is sound).
- **Fix direction**: safe abstractions (`bytemuck`, `zerocopy`, `MaybeUninit`
  flows) where the pattern repeats; the comment where the proof is genuinely
  local and checkable.

## evidence-erasure / type-laundering (`dyn Any`, downcasts)

`Box<dyn Any>` plus `downcast_ref` is a vtable where an enum belongs. Every
downcast site is a place the compiler cannot check exhaustiveness.

- **Accept**: genuine plugin registries with heterogeneous types, where the
  downcast sites are few, adjacent to registration, and documented.
- **Reject**: `Any` used to avoid naming a 3-variant enum; downcasts spread
  across call sites, each re-guessing.
- **Fix direction**: an enum (exhaustiveness checked) or a trait object with
  the *behavior* on the trait (no recovery needed at all).

## broad-untyped-contract (`Box<dyn Error>`, `anyhow::Error`)

In binaries and tiny CLIs, `anyhow` is earned simplicity. In library code it
hides the failure domain from every caller: they can neither match on
meaning nor document what they propagate.

- **Accept**: `main.rs`, examples, tests, prototypes with a named owner.
- **Reject**: library signatures returning `Box<dyn Error>` / `anyhow::Error`
  where callers branch on failure kind.
- **Fix direction**: a local error enum (`thiserror` for the `Display`/`From`
  plumbing), with variants named for *caller decisions*, not for internal
  stages. Keep `#[source]` chains intact — typed errors must not lose causes.

## boundary-not-parsed (`serde_json::Value` past decoding)

`Value` is the decode function's *working material*, not a domain model.
Parse once into `Deserialize` types at the I/O edge. Surviving exceptions:
pass-through proxies that never inspect the payload, and genuinely schemaless
envelopes (with the schema'd inner layers parsed normally).

## incomplete-failure-handling (`panic!` / `todo!` / `unimplemented!`)

In library code these stop somebody else's process. `todo!`/`unimplemented!`
in non-test code is an unfinished API, not a placeholder strategy — finish
it or return `Err`. `panic!` survives only for impossible states with the
impossibility argued next to it. (`unreachable!` after a genuinely exhaustive
match is the one macro form that carries its own proof; the guards leave it
alone for that reason.)

## dynamic-dispatch (`TypeId::of` branching)

Runtime identity checks replace a static contract. An enum or a trait method
moves the dispatch back under the compiler. The exception is type-indexed
infrastructure (DI containers, registries) — centralized, documented, and
never business logic branching on `TypeId`.

## dynamic-map-domain-model (`HashMap<String, Value/Any>` fields)

A struct field of dynamic values is a schema the compiler cannot see and
refactoring tools cannot follow. Name the value type. The exception is a
registry whose whole purpose is open-ended extension — in which case the
*registry* is the domain concept and deserves its own type with insertion
invariants, not a bare map field.
