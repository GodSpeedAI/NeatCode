# Ecosystem overlay: Python

Load this file when guard findings (or review evidence) implicate Python
patterns. It turns a deterministic finding into a repository judgment.

## broad-untyped-contract (`Any` params / returns / aliases)

`Any` is contagious: one `Any` parameter forces `Any` through every caller
and every test double. Decode unknown input at the boundary — pydantic
models, dataclasses with `__post_init__` validation, `TypedDict` for
JSON-shaped data — and keep `Any` out of signatures.

- **Accept**: plugin hooks and adapters whose contract is genuinely open
  (`**kwargs` forwarding to a documented callback), `__init__` overload
  shims, gradual-typing migration zones (marked, temporary).
- **Reject**: `Any` returns (every caller re-validates), `Any` aliases
  (a name that hides the broadness instead of removing it), `dict[str, Any]`
  as a domain model.
- **Fix direction**: the narrowest model that serves current callers;
  `object` → a protocol (`typing.Protocol`) where behavior, not data,
  is what varies.

## type-laundering (`cast` chains, widen-then-cast)

`typing.cast` fabricates evidence the checker cannot verify — chained casts
fabricate it twice. A single cast needs a `SAFETY:` comment naming the
invariant the checker cannot see (e.g. "validated by `parse_config`
above, which returns only `Route`"). Without it, restructure so the value
keeps its type.

## unjustified-escape-hatch (`cast` without `SAFETY:`)

Same test as TypeScript: the comment must name the checker-invisible
invariant, not restate the cast.

## incomplete-failure-handling (the sincerest family)

Python's slop concentrates here, and most of it is real bugs, not style:

- **Swallowed exceptions** (`except X: pass/continue/...`): every swallowed
  exception needs a named reason (idempotent retry, best-effort cleanup) or
  it is a defect. Logging with context or re-raising are the default fixes.
- **`eval`/`exec`**: never a shortcut; parse the input into a named domain
  type (`ast.literal_eval` for literals, a real grammar otherwise).
- **Mutable defaults** (`def f(x=[])`): shared-state bug, not idiom. Default
  to `None`, initialize inside. Same for dataclass fields
  (`field(default_factory=...)`).
- **`time.sleep` in `async def`**, **`datetime.utcnow()`**,
  **`async` without `await`**: each has exactly one correct fix
  (`asyncio.sleep`, `datetime.now(timezone.utc)`, drop the `async`).
- **`print` outside `__main__`**, **f-string logging**: observability debt.
  A logger with lazy `%s`-style args is the fix, not a preference.

## dynamic-dispatch (`getattr` / `hasattr` with names, `eval`)

Dynamic attribute access with a computed name replaces a contract with a
hope. Accept: documented plugin/adapter registries keyed by entry points,
`getattr(obj, name, default)` for genuinely optional capabilities. Fix:
a registry dict of named callables, a `Protocol`, or `functools.singledispatch`.

## stringly-typed-authority (`shape` names, numbered names)

`data2`, `result_final`, `shape` — names that describe position or structure
instead of role. Rename for the role; if no role exists, the code does not
understand its own data yet.
