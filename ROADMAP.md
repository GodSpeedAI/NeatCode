# Roadmap

What's next.

---

## Now

**Language-specific overlays.** The taxonomy is language-agnostic by design, which costs
precision. A thin overlay per ecosystem — Rust ownership and `unwrap` discipline, Go error
wrapping and goroutine lifetime, Python mutable defaults and async gotchas, TypeScript
structural-typing escapes and `any` leakage — loaded only when the changed files are in that
language. Overlays add signals and exceptions; they do not add new families.

---

## Next

**Caller discovery beyond grep.** `lib/context.mjs` finds callers textually and is honest about
its blind spots — dynamic dispatch, reflection, string-built names, other repositories. Where a
language server or an existing index is available, use it and record which method found what.
The finding model already distinguishes *confirmed* from *probable*; the harness should feed
that distinction rather than leaving it to the model.

**Architecture-test generation.** The conformance protocol frequently ends at "enforce this
with a dependency test." Emitting that test — in the repository's own test framework — closes
the loop between naming a rule and making it hold. Nominal architecture stays nominal exactly
as long as nothing fails when it is violated.

**`engineering.md` reconciliation as a first-class operation.** Today `study` writes the file
and the default flow reads it. The missing piece is a cheap "has this drifted?" pass that
compares recorded claims against current reality and reports only the deltas.

**Verification-command inference.** `neatcode checks` reads manifests. It should also read CI
configuration, which is where the *authoritative* definition of "passing" usually lives, and
flag the gap when local checks are weaker than CI's.

**Review of a change series.** Reviewing `main...HEAD` as one diff hides the shape of the work.
Per-commit review with a cross-commit summary would catch the pattern where commit 3 undoes
commit 1, and would make "was this bisectable?" answerable.

---

## Later

- **A worked corpus.** Real AI-generated patches with expert findings attached, used to
  calibrate severity and measure false-positive rate. The skill currently asserts its
  calibration; it should be able to demonstrate it.
- **Cross-repository study.** Extracting engineering DNA across a set of related services, to
  find the conventions that are organizational rather than local.
- **Pull-request integration.** Reading the description and the review conversation as stated
  intent — treated as untrusted evidence, which is what makes it interesting.
- **Debt ledger with interest.** `engineering.md` records known debt. Recording *when* it was
  recorded and what has since been built on top of it would make the trajectory claims in the
  taxonomy measurable rather than rhetorical.

---

## Explicitly not planned

Scope discipline is part of the product, so the exclusions are part of the roadmap.

- **A hosted service, an IDE extension, or telemetry.** This is a skill and a small harness.
- **A universal multi-language static analyzer.** Code acquires evidence; the skill judges. An
  AST framework would move judgment into procedural rules, which is the design this project
  exists to avoid.
- **Generalization to non-code "idea slop."** The generalization is real, but it is a
  different product. Diluting this one into a generic intellectual-quality framework would
  cost the specificity that makes it useful.
- **A design mode.** The upstream project NeatCode derives from — Hallmark — already does that
  well, and better than a bolted-on second product would.
