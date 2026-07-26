# Study examples — worked DNA extractions

Three worked `neatcode study` runs. Each shows what the verb is actually for: separating what a
repository **claims**, what it **expresses**, and — the distinction the whole verb rests on —
which of its repeated patterns are invariants, which are conventions, and which are residue.

> **Repetition is not intent.** A pattern repeated fifty times may be a load-bearing invariant,
> a reasonable convention, or the fossil record of one bad afternoon that everything since has
> copied.

Getting that wrong is expensive in both directions. Treating residue as invariant freezes an
accident into the architecture. Treating an invariant as residue breaks the system on the next
change.

---

## 01 · A service that outgrew its README

**Invocation:** `neatcode study .` in a five-year-old Node service.

**In one paragraph** *(the report opens here — a reader who stops after this should still have
the most important thing)*:

> A modular monolith in vocabulary and a layered application in practice. Billing owns its own
> state and enforces it well; identity and catalog share one ORM entity set and cannot be
> separated without a schema change. The repository is mid-migration from callback-style
> handlers to async ones — 31 of 44 converted, the remainder in `src/legacy/`. **Build on the
> async side.**

**Explicit claims**
- "Each module owns its data; no cross-module database access" — `docs/adr/0002.md:8`
- "Domain must not import infrastructure" — `AGENTS.md:31`

**Conformance — partially conformant.** Billing honours both claims. `identity` and `catalog`
share `prisma/schema.prisma` models and query each other's tables (`src/catalog/pricing.ts:44`).

**Invariants** — violating these breaks something nameable:
- Subscription status changes only through `SubscriptionState.transition()`. Enforced by a
  private field *and* `test/architecture.test.ts:14`. Audit records depend on it.
- Money is `Decimal`, never `number`. Enforced by the type system throughout.

**Conventions** — follow for consistency; not load-bearing:
- Handlers return `Result<T, AppError>` rather than throwing. Universal in `src/`, unenforced.
- Tests colocate as `*.test.ts` beside the source.

**Residue** — do not propagate:
- The `*Manager` suffix on six classes in `src/legacy/`. Absent from everything written after
  2024-03; no rationale in any ADR; the newer equivalents are named for their responsibility.
- `try/catch` blocks that log and rethrow unchanged, in those same six files. Adds nothing.

**How the residue was identified — this is the step that matters.** `git log` on the pattern:
present in files last substantially edited before 2024-03, absent from every file created
since. No ADR mentions it. Two recent modules solve the same problem without it. That is copied
habit, not convention.

**Contradiction**
- `README.md:22` describes an event-driven architecture. The event bus dispatches synchronously
  and awaits its handlers (`src/events/bus.ts:31`). One of the two should change; the cheaper
  fix is the README.

**Unknown**
- Whether the `catalog`/`identity` schema sharing is deliberate or accreted. No ADR either way;
  the introducing commit (`4f2a1c`) has the message "wip". **Ask a maintainer** — the answer
  decides whether that coupling is a finding or a design.

Recording that as `unknown` rather than guessing is the point. An inferred answer here would
have propagated into `engineering.md` and been treated as fact by every later run.

---

## 02 · A compiler, studied before contributing

**Invocation:** `neatcode study src/` in a Rust source-to-source compiler, before a first
contribution.

**In one paragraph:**

> A genuine pipeline: five stages with distinct owned representations, each testable with a
> fixture in and a fixture out. Stage boundaries hold everywhere except name resolution, which
> the parser performs for one construct — a deliberate, documented exception. The dominant
> engineering profile is *pipeline*; the surrounding CLI is *direct*.

**Invariants**
- Each stage consumes one representation and produces the next. No stage reaches backward.
  Enforced structurally: the crate graph makes a backward call impossible to compile.
- Diagnostics accumulate rather than abort. `Diagnostics` is threaded through every stage; no
  stage returns `Err` for a user-facing problem.
- Spans are preserved through every lowering. Enforced by `tests/spans.rs`.

**Convention**
- Fixture-driven tests: `tests/fixtures/<stage>/<case>.in` + `.expected`. Universal, unenforced
  by tooling, obviously intentional — the harness reads any file matching the shape.

**Documented exception, not residue**
- `parse::resolve_imports` performs name resolution inside the parser, which the stage rule
  otherwise forbids. `docs/adr/0007.md:14` records the reason (import paths affect lexing of
  raw-string delimiters) and the rejected alternative (a pre-pass). This is *earned* structure
  and belongs in `engineering.md` § Accepted patterns so nobody re-litigates it.

**Note the difference from example 01.** Both are patterns that violate a stated rule. One had a
recorded reason and a rejected alternative; the other had a commit message reading "wip". That
is the entire distinction between an exception and drift, and it is discoverable in about four
minutes of reading ADRs.

**Unknown**
- Whether the `lower` stage's arena allocation is a measured decision or an assumption. No
  benchmark in the repository. If it is unmeasured, the *performance-constrained* profile is
  being applied without evidence — which that profile itself says to report as a finding.

---

## 03 · A repository with nothing to claim

**Invocation:** `neatcode study .` in a two-year-old internal tool with no README architecture
section, no ADRs, and no `AGENTS.md`.

**In one paragraph:**

> No architecture is claimed. The structure that exists is coherent: feature-oriented at the top
> level, with a `lib/` used only for genuinely generic helpers. Dependencies flow feature → lib,
> never lib → feature, and never feature → feature — with exactly one exception. The absence of
> documentation is not a defect here; the absence of the one thing that would make the exception
> intelligible is.

**Observed structure**
- Top level: `billing/`, `catalog/`, `identity/`, `lib/`. Domain nouns, not technical roles.
- `lib/` contains string helpers, a typed event emitter, and a result type. No domain knowledge.
  It imports nothing from the feature directories — verified across all 41 files.

**The one exception**
- `catalog/pricing.ts:9` imports `billing/invoice.ts`. The only cross-feature edge in the
  repository. Everything else routes through explicit interfaces or events.

**Verdict — coherent emergent alternative.** Nothing claims an architecture, so there is nothing
to conform to; what exists is internally consistent and would be worth one paragraph in a README.

**What study does *not* do here.** It does not assign a textbook label, and it does not
recommend adopting one. The finding is the single cross-feature import — worth either
documenting as deliberate or removing. That is more useful than "consider adopting hexagonal
architecture," which is what an agent reaching for a label would have produced.

**Residue — one item**
- Four files still import a `formatDate` helper superseded by a `lib/date.ts` built eight
  months ago. Not harmful; the two implementations agree today. Worth noting because they
  *will* diverge, and because it signals an unfinished migration nobody is tracking.

---

## Emitting the portable artifact

Any of these can be locked into a portable `engineering.md`:

> *"Lock that into an engineering.md."*

Every entry is tagged `explicit` / `observed` / `inferred` / `disputed` / `unknown`, cited to
`path:line` where a citation exists, and stamped with the commit it describes:

```markdown
- Domain layer must not import infrastructure `explicit` — `AGENTS.md:31`, `docs/adr/0002.md`
- Enforced by `test/architecture.test.ts:14` `observed`
- Rule is violated in 6 of 14 domain files `observed` — see `src/domain/order.ts:12`
- Verdict: **nominal** — claimed and unenforced in practice `observed`
```

**The provenance tags are the whole safeguard.** Without them the file becomes an authoritative
hallucination: a document that reads like ground truth, is partly guesswork, and gets more
confident every time it is copied. An `inferred` entry that a later run verifies gets promoted
to `observed`. That is the file working as designed.

If `engineering.md` already exists, `study` **reconciles** rather than overwrites — showing what
changed, what is newly contradicted, and what was resolved. It never silently rewrites a file a
human wrote.
