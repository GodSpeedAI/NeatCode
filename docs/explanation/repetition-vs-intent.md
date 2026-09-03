# Explanation: Repetition Is Not Intent

The most intellectually demanding discipline in NeatCode's `study` and `audit` verbs is:

> **Repetition is not intent.**

A code pattern repeated fifty times across a repository may be a load-bearing invariant, a reasonable team convention, or the fossil record of an ancient mistake that subsequent engineers and agents copied without thought.

This document explains why conflating repetition with architectural intent degrades codebases, and details how NeatCode establishes the provenance of recurring patterns.

---

## The Tripartite Classification

When an engineer or agent encounters a recurring pattern, NeatCode categorizes it into one of three distinct buckets:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Invariant                                                           │
│    Must be preserved for the system to remain coherent and safe.       │
│    Violating it breaks something nameable (data loss, race condition). │
│    Enforcement: compiler types, DB constraints, architecture tests.    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Convention                                                          │
│    Worth following for consistency across the codebase.                │
│    Violating it is untidy, but does not break correctness or safety.   │
│    Enforcement: universal usage, team agreements, lint rules.          │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Historical Residue                                                  │
│    Repeated solely because earlier contributors copied prior files.    │
│    Carries no live rationale; often represents an abandoned migration. │
│    Enforcement: none (or actively declining in modern commits).        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## The Asymmetric Cost of Misclassification

Getting this distinction wrong is dangerous in both directions:

### 1. Treating Residue as an Invariant (The Cargo-Cult Trap)
An agent inspects a repository, notices that six legacy classes use a `*Manager` wrapper with empty `try/catch` rethrows, and concludes: *"This repository mandates Manager classes with defensive try/catch blocks."*

When the agent implements the next feature, it dutifully creates a new `*Manager` and adds redundant `try/catch` blocks. The historical accident is now frozen into the repository's permanent architecture.

### 2. Treating an Invariant as Residue (The Regression Trap)
An agent inspects a codebase, notices a seemingly redundant validation check or lock acquisition, assumes it is boilerplate residue, and "cleans it up" in the name of minimalism. The system merges, and production immediately experiences intermittent data corruption under load.

---

## How NeatCode Dates Patterns (`git log` Archaeology)

To separate live intent from historical residue, NeatCode does not rely on frequency counts. It dates the patterns through Git history:

### 1. Commit Recency
Run `git log` on files containing the pattern:
- **Residue Signature**: The pattern appears in 30 files last touched in 2021, but is completely absent from all files created after 2024. This is copied habit from the past, not an active convention.
- **Invariant/Convention Signature**: The pattern appears consistently in new files written last month by current core maintainers.

### 2. The Deliberate Counterexample
Search for modern files that deviate from the pattern. If a senior maintainer implemented a feature last month that bypassed the pattern without incident or negative review comment, the pattern is demonstrably optional.

### 3. Detecting Stalled Half-Migrations
A common source of slop is a stalled migration. Two patterns exist in the repository to solve the same problem (e.g. callback handlers vs. async/await handlers).
- If pattern A accounts for 70% of files but all new commits use pattern B, **build on pattern B**. Pattern A is residue waiting to be retired.
- A study that cannot detect half-migrations will advise contributors to build on the legacy pattern simply because it has a larger file count.

---

## Summary
Never assume that because a pattern is ubiquitous, it was intended. Always look for the date, the enforcement, the counterexample, and the earning constraint before propagating a pattern into new code.
