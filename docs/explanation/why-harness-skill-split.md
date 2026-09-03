# Explanation: Why Separate Harness and Skill?

A fundamental architectural decision in NeatCode is the clean, unyielding separation between its procedural Node.js CLI harness and its natural-language skill kernel.

This document records the design constraints, evaluated trade-offs, and rejected alternatives that established this boundary.

---

## The Boundary

```text
┌───────────────────────────────────────┐
│        Procedural Harness (JS)        │
│                                       │
│   • Runs Git commands                 │
│   • Parses diffs and line counts      │
│   • Discovers manifests & instructions│
│   • Scans local imports & callers     │
│   • Executes test commands            │
│   • Validates schema structure        │
│                                       │
│   NO JUDGMENT · NO EVALUATION         │
└──────────────────┬────────────────────┘
                   │
                   ▼ (Serialized Evidence)
┌───────────────────────────────────────┐
│       Natural Language Skill (MD)     │
│                                       │
│   • Interprets developer intent       │
│   • Weighs earnedness vs complexity   │
│   • Assesses architecture conformance │
│   • Discovers duplicated authority    │
│   • Evaluates 52 pre-completion gates │
│   • Scores critique axes              │
│                                       │
│   NO UNVERIFIED CLAIMS · EVALUATION   │
└───────────────────────────────────────┘
```

---

## Why Procedural Code Cannot Judge

The instinct of traditional tooling authors is to turn every quality rule into an AST (Abstract Syntax Tree) query or a static analysis lint rule:
- *"Flag any class ending in `*Manager`."*
- *"Disallow interfaces with only one implementation."*
- *"Enforce that `domain/` never imports `infra/`."*

In practice, procedural static analysis fails when applied to software design judgment for two reasons:

### 1. Structure is Context-Dependent
Consider an interface with a single implementation. Is it unearned complexity, or is it a published SPI designed for external third-party plugin authors?
Consider a class `SubscriptionManager` that forwards calls to `SubscriptionRegistry`. Is it an unearned pass-through wrapper, or is it a deliberate facade introduced to maintain API compatibility during a phased migration?

No AST parser can determine the answer from the code alone. The answer depends on **intent, history, team agreements, and external constraints**. Procedural rules either emit massive false positives (causing developers to disable the tool) or miss the issue entirely.

### 2. The Linter Maintenance Trap
To build a universal procedural analyzer across modern codebases, one must maintain parsers and symbol resolvers for TypeScript, JavaScript, Python, Rust, Go, Java, C#, Ruby, PHP, and C++. The tooling becomes an enormous, fragile dependency graph that spends more time fixing parser bugs than improving engineering judgment.

---

## Why LLMs Cannot Acquire Evidence Reliably

The opposite architectural error is to give an LLM agent full access to terminal tools and expect it to gather its own context without a structured harness:

1. **Context Flooding**: When left to explore freely, agents dump entire files, run recursive directory listings, and burn their attention budget before they even begin reasoning.
2. **Confirmation Bias**: An agent that wrote a bug has an innate bias toward confirming its own correctness. If asked *"did you check if this utility exists elsewhere?"*, it will frequently search carelessly, find nothing, and assert that the utility is unique.
3. **Fabricated Execution**: LLMs are statistical pattern engines. If an agent believes a test *should* pass, it is prone to claiming *"all tests pass"* without ever spawning the test runner process.

---

## The Solution: Evidence vs. Interpretation

NeatCode resolves this tension by assigning each half of the system the exact task it excels at:

1. **The Harness produces undeniable facts**:
   - The diff contains 41 additions and 6 deletions.
   - `src/billing/state.ts` imports `src/billing/types.ts`.
   - `npm test` was executed; it took 1,240 ms and exited with code `0`.
   - These facts are structured deterministically into the Change Envelope.
2. **The Skill interprets those facts with semantic depth**:
   - Given the stated intent and the callers of `SubscriptionState`, does adding this transition method violate single-authority ownership?
   - The model reasons across the facts provided by the harness, unburdened by the need to navigate the filesystem or parse raw Git outputs.

By maintaining this separation, NeatCode remains lightweight, zero-dependency, and language-agnostic, while equipping the AI model to deliver genuine senior-engineering judgment.

---

## Related Documents
- [Architecture Blueprint](../../architecture.md) — High-level system structure.
- [Subsystem: CLI and Harness](../subsystems/cli-and-harness.md) — Procedural implementation.
- [Subsystem: Skill Kernel](../subsystems/skill-kernel.md) — Natural language protocol.
- [Why Bounded Context Rings?](why-bounded-context.md) — Token and attention management.
