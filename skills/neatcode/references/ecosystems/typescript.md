# Ecosystem overlay: TypeScript / JavaScript

Load this file when guard findings (or review evidence) implicate
TypeScript/JavaScript patterns. It turns a deterministic finding into a
repository judgment: when the pattern matters, what a legitimate exception
looks like, and which fix fits this ecosystem.

## type-laundering (`as` chains, widen-then-assert)

An assertion is a claim the compiler cannot check. It is earned at a
**decoding boundary** — `JSON.parse`, `fetch().json()`, `postMessage`,
`localStorage` — where untyped input enters and a validator (zod, valibot,
effect-Schema, or a hand-written parser returning a discriminated union)
establishes the type once. It is unearned in the middle of typed code, where
the value already had a type and the author threw it away.

- **Accept**: one `as` at the single decode site, with a `SAFETY:` comment
  naming the validator or the checked invariant. Narrowing a `catch (e:
  unknown)` to `Error` after an `instanceof` check.
- **Reject**: `as` on values that flow from typed callers; chained
  assertions; `as` inside `.map`/reducers reconstructing what a signature
  already knew.
- **Fix direction**: move the assertion outward to the boundary function and
  give that function a precise return type. Callers should never assert.

## broad-untyped-contract (`unknown` / `any` / `Record<string, unknown>`)

`unknown` in a signature is a postponed decision charged to every caller.
Legitimate at the boundary (the decode function's *input*), corrosive as a
public contract (its *output* and everything downstream).

- **Accept**: framework-mandated positions (middleware `ctx.state`, plugin
  hooks with documented schemas), test fixtures, one-off scripts.
- **Reject**: exported functions returning `unknown`/`any`; props/context
  types that push validation into every consumer; `Record<string, unknown>`
  standing in for a statable interface.
- **Fix direction**: a named interface at the narrowest point that serves
  all callers; a parser at the boundary; generics with constraints instead
  of `any` where the shape genuinely varies.

## unjustified-escape-hatch (bare `as`)

Read the `SAFETY:` comment as the actual finding: a comment naming the
validator, the `instanceof` narrowing, or the protocol invariant resolves
it. A comment restating the assertion (`// cast to Foo`) does not — that is
the escape hatch cosplaying as justification.

## dynamic-dispatch (`Reflect.get` / `Reflect.apply`)

Almost always replaceable: typed access, an index signature on a named
type, or a `Map` of named handlers. The surviving exception is interop with
genuinely dynamic hosts (plugin loaders, deserialization frameworks) — and
even there the reflective core belongs behind one typed facade, not
scattered at call sites.

## dependency-substitution (`vi.mock` / `jest.mock`)

Module mocking proves the mock wiring, not the production behavior. Prefer:
dependency injection through constructor/parameters, `vi.spyOn` on an
object you own, or testing against a fake behind the real interface
(MSW for network, not module rewiring). Surviving exceptions: timers
(`vi.useFakeTimers`), and modules that *are* the environment boundary
(`fs` in a CLI test is still better served by a temp dir than a mock).

## stringly-typed-authority (`shape` in names)

`shape` describes structure, never ownership. Rename for the domain role:
`payloadShape` → `lineItem`, `responseShape` → `invoice`. When the name
genuinely cannot be more specific, that is itself a finding — the code does
not know what it holds.
