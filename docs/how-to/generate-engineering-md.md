# How-To: Generate and Maintain `engineering.md`

This guide explains how to extract a repository's engineering DNA using `neatcode study` and create a durable, portable `engineering.md` profile at the repository root.

---

## Goal
Extract the repository's invariants, authority maps, conventions, accepted patterns, and technical debt into an `engineering.md` file that future AI coding agents can read before writing code.

---

## Prerequisites
- NeatCode installed (`neatcode` CLI and skill).
- Clean working tree recommended (`git status` clean).
- Familiarity with the provenance tagging rules in [`references/engineering-md.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/engineering-md.md).

---

## Procedure

### Step 1: Acquire the Repository Envelope
Run the harness in whole-repository study mode:

```bash
neatcode envelope --repo --verb study
```

*(Alternatively, to study a specific subsystem, pass `--paths src/billing`)*.

### Step 2: Prompt the Agent to Execute `study`
Pass the output into your AI coding assistant with the prompt:

> *"neatcode study the repository and generate an engineering.md file at the root."*

The agent will:
1. Parse documented architecture claims from `README.md` and ADRs.
2. Inspect physical imports and call graphs to assess architectural phenotype conformance.
3. Use `git log` to date recurring patterns, separating live invariants from historical residue.
4. Construct an authority map identifying the single owner for each critical invariant.
5. Synthesize `engineering.md`.

### Step 3: Audit Provenance Tags
Open the generated `engineering.md`. Verify that **every substantive claim carries an explicit provenance tag**:

```markdown
- Domain layer must not import infrastructure `explicit` — `AGENTS.md:31`, `docs/adr/0002.md`
- Enforced by `test/architecture.test.ts:14` `observed`
- Rule is violated in 6 of 14 domain files `observed` — see `src/domain/order.ts:12`
- Verdict: **nominal** — claimed and unenforced in practice `observed`
```

The five permitted tags are:
- `explicit`: Directly stated in a file (must cite `path:line`).
- `observed`: Verifiable by direct inspection of current code.
- `inferred`: A plausible conclusion from patterns, not directly proven.
- `disputed`: Conflicting documentation or code paths.
- `unknown`: A critical question with no current answer in the repository.

### Step 4: Review and Commit
Remove any speculative claims that lack citations. Commit the file:
```bash
git add engineering.md
git commit -m "docs: generate engineering.md profile via neatcode study"
```

---

## Maintaining `engineering.md` Over Time

Whenever you introduce a new architectural decision, ADR, or invariant:
1. **Update the Authority Map**: If a new state transition is created, declare its canonical owner in `engineering.md` § Authority map.
2. **Promote Inferred to Observed**: When an inferred assumption is validated by an integration test, update its tag from `inferred` to `observed`.
3. **Record Debt with Location**: When intentional shortcuts are taken, log them in § Known debt with file citations and consequences so future agents do not copy them as conventions.
