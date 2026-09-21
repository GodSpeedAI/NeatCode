# Deterministic guards

NeatCode ships deterministic anti-slop analysis for JavaScript/TypeScript,
Python, Go, and Rust. A guard finding is **evidence, not judgment**: it
establishes that an AST or syntactic pattern exists, never what it means for
this repository. Severity, attribution to the change, and remediation stay
with you.

## When to run them

- **Baseline at orientation** (Step 0), when the task touches source files in
  a guarded language: `neatcode guard --paths <area>`. The baseline exists so
  legacy violations are not misattributed to the current change.
- **Diff-scoped pass after Verify** (Step 7), before Critique (Step 8):
  `neatcode guard --staged` (or `--baseline <rev>`). Read the
  introduced/worsened/exposed/pre-existing/resolved labels; do not blame the
  patch for debt it merely stood next to, and do not let a patch launder new
  debt because the file was already bad.
- **Opt-in envelope evidence**: `neatcode envelope --guards` embeds the guard
  section for changed paths. Ordinary envelopes stay cheap; request guards
  when the change is Standard or Deep.

Skip guards at Trace depth, for docs-only changes, and for languages outside
the four supported ones. Do not manufacture equivalent checks by hand when
the guard already covers the pattern — and do not treat a clean guard run as
proof of quality. A guard that cannot run (missing runtime, parse failure)
reports `not runnable`, never `passed`.

## Reading a finding

Each finding carries `rule_id`, `neatcode_family`, `upstream_rule_id`,
`language`, `path`, `line`, `message`, and `severity`. The family
(type-laundering, evidence-erasure, boundary-not-parsed, …) names the
language-independent engineering concept; the full taxonomy lives in the
harness (`lib/guards/taxonomy.mjs`). The upstream id preserves traceability
to the donor analyzer (anti-slop, anti-slop-python, anti-slop-go); Rust
rules are NeatCode-owned and carry no upstream id.

## How to judge one

1. **Locate the pattern** in the file. Confirm the detector did not misfire
   on an idiom this repository uses deliberately (the detectors are
   syntactic; documented precision limits live in `lib/guards/*.mjs` headers).
2. **Ask the earnedness question.** A `SAFETY:`-less assertion at a genuine
   boundary with a checked invariant is a missing comment; the same pattern
   papering over an unparsed boundary is a structural defect. Same finding,
   different consequence.
3. **Check provenance.** `introduced` and `worsened` belong to the change.
   `exposed` deserves a mention, not blame. `pre-existing` is out of scope
   unless it blocks safe completion. `resolved` is evidence the change
   improved something — say so.
4. **Propose the repository-shaped fix**: the canonical owner type, the
   existing parsing boundary, the seam the codebase already provides — not a
   generic textbook correction. Load the ecosystem overlay for the finding's
   language before judging consequence: [`ecosystems/typescript.md`](ecosystems/typescript.md) ·
   [`ecosystems/python.md`](ecosystems/python.md) ·
   [`ecosystems/go.md`](ecosystems/go.md) ·
   [`ecosystems/rust.md`](ecosystems/rust.md).

## What guards never do

- They do not assess abstraction earnedness, authority duplication,
  architectural conformance, or operational credibility. Those need the
  repository; a pattern matcher does not have it.
- They do not override repository instructions. An explicitly adopted broad
  contract (recorded in `engineering.md` or `AGENTS.md`) beats a guard
  finding; note the conflict rather than "fixing" the code.
- They do not detect authorship. NeatCode cares whether the code is
  engineered, not whether a human or a model wrote it.
