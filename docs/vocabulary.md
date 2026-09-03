# NeatCode Domain Vocabulary

This glossary defines the specific vocabulary and technical terminology used across NeatCode's harness, skill definitions, failure taxonomy, and reports.

---

## A

### Archetype
A classification of a code change based on its computational nature rather than its file type or language. NeatCode defines 11 archetypes (e.g., *pure transformation*, *stateful domain operation*, *boundary adapter*, *workflow orchestration*). The archetype determines **which quality rules bind hardest**; for example, a pure transformation requires rigorous table-driven tests but relaxes concurrency rules, whereas a safety-critical path demands extreme redundancy.
- *Source*: [`skills/neatcode/references/archetypes.md`](../skills/neatcode/references/archetypes.md)

### Architectural Phenotype
The observable, expressed architecture of a software system discovered through its import statements, module boundaries, directory layout, and runtime call graph. It is contrasted with the **genotype** (the claimed architecture in READMEs and ADRs).
- *Source*: [`skills/neatcode/references/architecture/phenotype.md`](../skills/neatcode/references/architecture/phenotype.md)

### Authority
The sole entity, module, or function responsible for validating, maintaining, and transitioning a specific invariant or piece of business state. NeatCode enforces *canonical authority*: every invariant must have exactly one owner.
- *Source*: [`skills/neatcode/references/taxonomy/authority.md`](../skills/neatcode/references/taxonomy/authority.md)

---

## B

### Bounded Context Rings
A technique implemented in `lib/context.mjs` that expands context for a modified file by exactly one ring outward (owning package, local imports, discoverable callers, related tests) without loading the entire repository tree. Context rings return lightweight file pointers rather than full file contents.
- *Source*: [`lib/context.mjs:110-127`](../lib/context.mjs#L110-L127)

---

## C

### Change Envelope
The comprehensive structured evidence artifact assembled by `lib/envelope.mjs`. It binds the requested intent, unified diff, directory morphology, instruction files, manifests, context rings, and execution records of verification checks into an auditable Markdown or JSON payload.
- *Source*: [`lib/envelope.mjs:33-112`](../lib/envelope.mjs#L33-L112)

### Code Slop
Plausible code that technically works and passes tests, but has not earned the confidence it projects. Slop mimics the cosmetic structure of professional software (interfaces, factories, wrappers, unit tests) without realizing any of its functional benefits.
- *Source*: [`README.md:34-41`](../README.md#L34-L41)

### Conformance Verdict
The conclusion returned by the architectural phenotype protocol when comparing claimed architecture against expressed code. One of six verdicts: `conformant`, `partially conformant`, `nominal`, `contradictory`, `unverifiable`, or `coherent emergent alternative`.
- *Source*: [`skills/neatcode/references/architecture/phenotype.md:86-98`](../skills/neatcode/references/architecture/phenotype.md#L86-L98)

### Convention
A repeated code pattern that is followed for consistency across a codebase, but whose violation does not break system correctness or data integrity. Contrasted with *invariants* and *residue*.
- *Source*: [`skills/neatcode/references/verbs/study.md:35-46`](../skills/neatcode/references/verbs/study.md#L35-L46)

---

## D

### Depth Ladder
A tri-level escalation protocol (`Trace`, `Standard`, `Deep`) chosen before starting work. Determines which gate groups and reasoning sequences execute. Critical domains (payments, auth, concurrency, migrations) automatically escalate to `Deep`.
- *Source*: [`skills/neatcode/SKILL.md:114-129`](../skills/neatcode/SKILL.md#L114-L129)

---

## E

### Earnedness
The core design discipline requiring every abstraction, interface, layer, dependency, or configuration knob to be justified by a demonstrable, concrete real-world constraint that exists *today*.
- *Source*: [`skills/neatcode/references/restraint.md:8-30`](../skills/neatcode/references/restraint.md#L8-L30)

### `engineering.md`
A root-level repository document synthesized by `neatcode study` that captures the project's engineering DNA: claimed vs. observed architecture, authority maps, invariants, conventions, accepted patterns, prohibited patterns, and known technical debt. Every substantive claim carries a provenance tag (`explicit`, `observed`, `inferred`, `disputed`, `unknown`).
- *Source*: [`skills/neatcode/references/engineering-md.md`](../skills/neatcode/references/engineering-md.md)

### Evidence
Observable proof that supports an engineering claim. Claims are strictly categorized as `verified` (executed command with observed exit code), `inspected` (traced code path), or `assumed` (plausible hypothesis). Unrun checks are explicitly labeled `not-run`.
- *Source*: [`skills/neatcode/references/evidence.md`](../skills/neatcode/references/evidence.md)

---

## I

### Invariant
A property or rule that must hold true at all times for the software to remain coherent and correct. Violating an invariant breaks something nameable (e.g. data corruption, security hole, race condition).
- *Source*: [`skills/neatcode/references/verbs/study.md:37-38`](../skills/neatcode/references/verbs/study.md#L37-L38)

---

## N

### Nominal Architecture
An architectural state where the vocabulary of an architecture exists in folder names, class names, or documentation, but the actual functional and structural properties are absent (e.g. folders named `domain/` and `infra/`, but domain classes directly construct SQL queries). Also known as *architecture cosplay*.
- *Source*: [`skills/neatcode/references/architecture/phenotype.md:90`](../skills/neatcode/references/architecture/phenotype.md#L90)

---

## P

### Pre-Completion Gates
A checklist of 52 specific questions grouped into 8 categories (Epistemic Integrity, Behavioural Contract, Repository Fit, Structural Proportionality, Authority and State, Completion, Evidence, Change Discipline). Evaluated after implementation during Step 8; every gate requires an honest `no`.
- *Source*: [`skills/neatcode/references/gates.md`](../skills/neatcode/references/gates.md)

### Profile
A coherent, bounded set of architectural trade-offs inherited from the surrounding codebase. NeatCode defines 7 profiles (*direct*, *domain-centered*, *pipeline*, *boundary-hardened*, *operational*, *performance-constrained*, *evolutionary*). Profiles are **inherited for consistency**, never rotated for novelty.
- *Source*: [`skills/neatcode/references/profiles.md`](../skills/neatcode/references/profiles.md)

### Provenance
The exact causal relationship between a defect finding and the change under review. Categorized as:
- `introduced`: Created by this change.
- `worsened`: Existed previously; this change increased its reach, severity, or cost.
- `exposed`: Untouched by the patch, but made reachable or load-bearing.
- `pre-existing (blocking)`: Pre-existing defect that prevents this change from completing safely.
- `pre-existing (out of scope)`: Real debt that is not the patch's responsibility.
- `resolved`: Fixed or eliminated by this change.
- *Source*: [`skills/neatcode/references/findings.md:37-54`](../skills/neatcode/references/findings.md#L37-L54)

---

## R

### Reasoning Sequence
The mandatory five-step sequential protocol followed during every verb:
1. **Intent**: Verifying what was asked and identifying constraints.
2. **Surface**: Reading the visible change shape before semantic meaning.
3. **Structure**: Determining where code belongs and validating canonical authority.
4. **Semantics**: Tracing data flow, invariants, error paths, and concurrency.
5. **Evidence**: Auditing test execution, command exit codes, and coverage truth.
- *Source*: [`skills/neatcode/references/reasoning.md`](../skills/neatcode/references/reasoning.md)

### Residue
A repeated code pattern that exists solely because it was copied from earlier files or past migrations, having no live architectural rationale or active enforcement. Propagating residue propagates historical accidents.
- *Source*: [`skills/neatcode/references/verbs/study.md:40-42`](../skills/neatcode/references/verbs/study.md#L40-L42)

---

## S

### Six Critique Axes
The six standardized quality dimensions scored 1–5 before completion:
1. **Correctness**: Behavioral accuracy across main and edge paths.
2. **Repository Fit**: Alignment with local conventions and canonical paths.
3. **Semantic Integrity**: Clear ownership and preservation of invariants.
4. **Restraint**: Earning constraints for all abstractions.
5. **Operational Credibility**: Robustness under timeouts, failures, and concurrency.
6. **Evidence**: Verifiable proof for all claims.
*Any score below 3 forces an implementation revision pass.*
- *Source*: [`skills/neatcode/references/gates.md:94-110`](../skills/neatcode/references/gates.md#L94-L110)

---

## V

### Verbs
The five specialized operational modes supported by NeatCode:
- `review`: Evaluates a proposed change (diff) through repository context.
- `audit`: Evaluates existing files or systems without diffs or edits.
- `restructure`: Replaces implementation strategies while preserving behavior using characterization baselines.
- `study`: Extracts engineering DNA, dating patterns to separate invariants from residue.
- `harden`: Completes happy-path implementations for production resilience (idempotency, cancellation, error recovery).
- *Source*: [`skills/neatcode/SKILL.md:27-53`](../skills/neatcode/SKILL.md#L27-L53)
