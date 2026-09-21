# Ecosystem overlay: Go

Load this file when guard findings (or review evidence) implicate Go
patterns. It turns a deterministic finding into a repository judgment.

## unjustified-escape-hatch (G01 assertions, G11 process stops)

A justification comment is not bureaucracy — it is the invariant written
down. A good one names the property that makes the panic unreachable
("`cfg` is decoded and validated in `Load` above; `port` is always set").
A bad one restates the code ("assert to string"). Judge the comment, not
just its presence.

- **Assertions**: comma-ok is the default for recoverable uncertainty;
  single-result form is for invariants with proof. No comment, no proof.
- **`panic` / `os.Exit` / `log.Fatal`**: legitimate for impossible states
  *with the impossibility argued*, in `main`/`init`, and in tests. In
  library code a panic stops somebody else's process — return the error.
  A rethrow after `recover` is plumbing, not a decision.

## broad-untyped-contract (`any`, `map[string]any`, `interface{}`)

Go's zero-value culture makes `any` especially corrosive: every consumer
re-discriminates. Decode at the boundary (`encoding/json` into structs,
never into `map[string]any` held past the handler) and carry concrete
types inside.

- **Accept**: `fmt`-style variadic tails, `...any` adapters over truly open
  plugin points, `cause`-style error wrapping, signatures fixed by an
  external API (marked `CONTRACT:`, naming the API), methods satisfying an
  imported interface.
- **Reject**: `any` results, `map[string]any` fields/params/vars, alias
  names hiding the broadness (`type Payload = any`).
- **Fix direction**: a named struct; a constrained type parameter where the
  shape genuinely varies; a `kind` field plus one handler per type where a
  type switch sprawls.

## type-laundering (G05 `any` in, assertion out)

The widening is the defect, not the assertion. `any(v).(T)` and
`var v any = concrete` followed by `v.(T)` both say: the author knew the
type, discarded it, and guessed it back. Keep the concrete type end to end.
The carve-out is real: `any(x)` over a value the function cannot know
(a parameter, a map read, a channel receive) is a genuine question — flag
the *absence of decoding*, not the conversion.

## dynamic-dispatch (G06 type switches, G07 `reflect`)

A type switch on `any` re-parses away from the boundary. Replace with: a
`kind` discriminator field, a sealed interface (unexported marker method),
or one handler per type behind a registry. `reflect` belongs in
serialization libraries and test `DeepEqual`, not application code.

## runtime-type-recovery (G10 assertions/switches on errors)

`err.(T)` fails through `%w` wrappers — the exact errors worth matching are
the wrapped ones. `errors.As` / `errors.Is` walk the chain. A type switch on
an error is the same defect with more cases.

## dependency-substitution (G08 rewiring in tests)

`pkg.Var = func...`, patch libraries, `//go:linkname` — all rewire
production through a mutable global. The seam belongs in the design:
accept an interface or function value as a parameter or field, and hand the
test its own value. If production has no seam and cannot take one yet, say
so and name the debt; do not bless the rewire.

## stringly-typed-authority (G13 error-text asserts)

`err.Error() == "..."` passes for the wrong error with the right words and
fails for the right error reworded. Sentinels with `errors.Is`, types with
`errors.As`. Message text is for humans reading logs, never for tests
asserting identity.
