# NeatCode

**A software-engineering skill for Claude Code, Cursor, and Codex that refuses to ship
plausible code.**

[Live demo →](./site/index.html) &nbsp;·&nbsp; five verbs &nbsp;·&nbsp; fourteen failure families &nbsp;·&nbsp; fifty-two pre-completion gates.

> Code that is reasoned, not generated.

*Neat* in the joinery sense: **a neat fit** — exact, earned, nothing left over. Not tidiness,
not formatting. NeatCode has nothing to say about brace style and a great deal to say about
whether that `ProviderManager` should exist.

---

## What it is for

The problem is not that AI writes ugly code. It is that AI writes **plausible** code: locally
correct, globally wrong. It adds an interface with one implementation. It writes a second
`normalizeEmail` beside the one that already exists. It calls an API that does not exist in the
installed version. It wraps a registry in a manager that forwards every call. It writes a test
that passes against the bug. It says "all tests pass" without running them.

Each of those is defensible in isolation. Together they are how a codebase becomes
unmaintainable in six months.

NeatCode installs the judgment of an engineer who has read the repository — before the agent
writes, and again before it claims to be done.

---

## Five verbs

| Verb | What it does |
| --- | --- |
| *(default)* | Implement a change. Orient in the repository, state the contract, choose the structure **before** the syntax, implement the smallest coherent change, then critique the diff before declaring completion. |
| `neatcode review [source]` | Judge a proposed change — working tree, staged, a commit, a range, a branch, a patch, a pasted diff. Every finding labelled **introduced · worsened · exposed · pre-existing · resolved**. |
| `neatcode audit <target>` | Judge existing code — a file, a module, a subsystem, the repository. Architecture conformance, authority, boundaries, tests, operational readiness, debt. No edits. |
| `neatcode restructure <target>` | Keep the behaviour, replace the implementation strategy. Characterizes behaviour before changing it. |
| `neatcode study <target>` | Extract the repository's engineering DNA. Separates **invariants** from **conventions** from **residue**. Optionally writes a portable `engineering.md`. |
| `neatcode harden <target>` | Take working-on-the-happy-path code to production credibility: idempotency, concurrency, cancellation, recovery, observability, security boundaries, migrations, wiring. |

---

## The change envelope

A diff alone cannot be judged. A new `ProviderManager` that forwards to a `ProviderRegistry`
is unearned indirection **or** a deliberate stable facade, and nothing in the diff decides
which.

```text
change envelope
= requested intent
+ diff or change set
+ changed-file context
+ repository instructions
+ declared architecture
+ observed repository structure
+ relevant dependencies and callers
+ tests and verification evidence
```

A small zero-dependency harness assembles it deterministically:

```bash
neatcode envelope --staged --verb review --verify "npm test"
neatcode envelope --range main...HEAD --verb review
neatcode envelope --paths src/billing --verb audit
neatcode envelope --repo --verb study --json
neatcode checks                                  # what the repo declares as proof
```

The harness **acquires and structures evidence**. It never judges. There is no field in the
envelope schema meaning "assumed to pass" — that absence is the point.

---

## What it actually checks

**Two questions**, applied relentlessly:

- **Earnedness** — *what concrete constraint earns this complexity?* "It's more extensible" is
  not a constraint. A second implementation that exists today is.
- **Evidence** — *what supports the claim that this is correct and complete?* "Tests pass" is a
  claim about a command you ran and an exit code you saw.

**Fourteen failure families**, each entry carrying its definition, signals, underlying
reasoning failure, risk, debt trajectory, legitimate exceptions, likely false positives,
correction, and verification:

epistemic · context · contract · completion · abstraction · authority · boundary ·
state & concurrency · failure-handling · tests · observability · security · change-discipline ·
maintainability theater

**An architectural conformance protocol** that compares what a repository *claims* against
what its imports and call graph *express*, and returns a verdict: conformant · partially
conformant · **nominal** · contradictory · unverifiable · coherent emergent alternative.

That last verdict matters: code that has diverged from its README into something coherent is
not decayed. The documentation is wrong, and that is the cheaper fix.

**Fifty-two pre-completion gates** in eight groups, and a six-axis critique — correctness ·
repository fit · semantic integrity · restraint · operational credibility · evidence — where
anything below 3 forces a revision pass.

---

## Install

```
npx skills add GodSpeedAI/NeatCode
```

Or copy [`SKILL.md`](skills/neatcode/SKILL.md) + [`references/`](skills/neatcode/references/) into:

- **Claude Code**: `~/.claude/skills/neatcode/`
- **Cursor**: `.cursor/rules/neatcode.mdc` (body of `SKILL.md`, no frontmatter)
- **Codex**: `~/.codex/skills/neatcode/` (personal) or `.codex/skills/neatcode/` (project-scoped)

For the harness:

```bash
npm install -g neatcode-skill    # provides the `neatcode` command
```

The skill works without it — it falls back to plain `git diff` — but the harness is what makes
"did that check actually run?" an auditable fact rather than a recollection.

---

## Try it

```bash
# review what you are about to commit
git add -A && neatcode envelope --staged --verb review --verify "npm test"
# then, in your agent: "neatcode review the staged changes"
```

Worked invocations in [`docs/recipes.md`](docs/recipes.md). Worked DNA extractions in
[`docs/study-examples.md`](docs/study-examples.md).

---

## Design notes

**The intelligence is natural language.** The judgment lives in Markdown — a kernel plus
progressively-loaded references — not in procedural code. Code acquires and structures
evidence; the skill interprets it. That division is deliberate and load-bearing.

**No source-file stamps.** NeatCode never writes marker comments into your codebase. Comment
stamps are exactly the ceremonial noise it reports as a finding. The record lives in the
completion block and, for durable facts, in `engineering.md`.

**No variety rule.** Consistency *is* the quality in a codebase. Any instinct to "do it
differently this time" is a bug in the agent, not a feature of the skill.

**Style is not a defect.** If a linter runs in CI, the linter owns it. A skill that reports
formatting as a finding trains its users to ignore its findings.

---

## Derivation

NeatCode is derived from [Hallmark](https://github.com/Nutlope/hallmark), an anti-AI-slop
*design* skill by Together AI, released under the MIT License. It keeps Hallmark's architecture
— a natural-language kernel, progressively-loaded references, verb dispatch, a pre-emit
critique, and gate-based quality checks — and replaces the subject matter entirely: design
judgment becomes engineering judgment.

Two mechanisms were deliberately **inverted** rather than translated, and the reasoning is
worth stating because it is the sharpest difference between the two products:

- **Theme rotation → profile inheritance.** Hallmark rotates its visual fingerprint so two
  pages do not look alike. Code must not vary to avoid repetition; a codebase that varies for
  variety's sake is unlearnable.
- **CSS stamps → report blocks.** Hallmark stamps its output. A code skill that wrote marker
  comments into source files would be emitting the exact debt it exists to catch.

The reasoning behind the transformation is preserved in
[`docs/origin-conversation.md`](docs/origin-conversation.md).

There is **no `hallmark` compatibility alias.** The two skills judge different artifacts;
routing a design request into a code skill would be worse than a missing command.

---

## Licence

MIT. Use it, fork it, ship it. See [`LICENSE`](LICENSE) for the retained upstream notice.
