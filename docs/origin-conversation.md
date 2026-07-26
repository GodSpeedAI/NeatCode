# NeatCode

**User:** Anonymous  
**Created:** 7/26/2026 13:25:41  
**Updated:** 7/26/2026 15:32:45  
**Exported:** 7/26/2026 15:33:25  
**Link:** [https://chatgpt.com/c/6a66421f-3638-83ea-9f99-cac612e6cc80](https://chatgpt.com/c/6a66421f-3638-83ea-9f99-cac612e6cc80)  

## Prompt:
7/26/2026, 1:25:39 PM

Look up the Hallmark skill and review it’s repo , what it does, how it does it, it’s verbs, what they do. And explain it all to me incisively, etc so I can validate your understanding

## Response:
7/26/2026, 1:25:41 PM

> **Searching the web**
>
>
> **Searching www.reddit.com**
>
> 
>
> Worked for a couple of seconds

I've looked through the repository and documentation. My understanding is that **Hallmark is much more than a prompt that says "make prettier UIs."** It's a design operating system that attempts to push an LLM away from the statistical average of AI-generated interfaces. ([GitHub](https://github.com/nutlope/hallmark?utm_source=chatgpt.com))

## The problem Hallmark is solving

Hallmark starts from a simple observation:

> Modern LLMs have learned the *mean* of web design.

That mean produces pages that almost always contain:

- centered hero
- gradient background
- rounded cards
- blue accent
- glassmorphism
- predictable spacing
- identical component hierarchy

These pages are technically good, but visually have the unmistakable "AI made this" fingerprint.

Hallmark's goal is **not better CSS.**

Its goal is **distribution shifting**.

Instead of sampling the center of the design distribution, it intentionally pushes generation toward less-common but still coherent regions of design space. The README explicitly describes this as refusing "on-distribution defaults," selecting different macrostructures, themes, and passing outputs through dozens of anti-slop checks before emitting the result. ([GitHub](https://github.com/nutlope/hallmark?utm_source=chatgpt.com))

---

# The mental model

Think of Hallmark as a compiler.

Instead of

> prompt
→ HTML

it becomes

> prompt
→ infer design intent
→ choose architecture
→ choose visual language
→ choose typography
→ choose spacing philosophy
→ choose interaction style
→ reject common AI patterns
→ self critique
→ HTML

So there is an explicit latent planning phase.

---

# The pipeline

Conceptually I see Hallmark operating roughly like this:

```
Brief

↓

Understand domain

↓

Choose macrostructure

↓

Choose visual fingerprint

↓

Apply theme

↓

Generate layout

↓

Run slop tests

↓

Self critique

↓

Emit
```

Notice that **generation is almost the final step**, not the first.

---

# Macrostructure

This is probably the most important idea in the repository.

Hallmark doesn't begin with colors.

It begins with page architecture.

Examples might be things like

- editorial
- newspaper
- gallery
- timeline
- product narrative
- asymmetrical landing page
- documentation
- museum exhibit
- magazine
- manifesto

(These are conceptual categories rather than the exact internal taxonomy.)

The macrostructure determines

- visual rhythm
- information flow
- density
- pacing
- hierarchy

before individual components exist.

This is why two Hallmark pages can feel unrelated even if they share technology.

---

# Themes

After selecting architecture it selects a theme.

The repository ships with around twenty themes plus a "Custom" branch when none fit the brief. A theme is much more than a color palette-it bundles typography, composition, spacing, tone, and overall visual vocabulary. ([GitHub](https://github.com/nutlope/hallmark?utm_source=chatgpt.com))

Examples from the repo include:

- Hum
- Cobalt
- Carnival
- Lumen
- Garden
- Riso
- Atmospheric
- Modern Minimal
- Custom

These are closer to **design languages** than templates.

---

# Slop tests

This is probably the most interesting engineering decision.

Hallmark mentions **57 slop-test gates** plus a **pre-emit self-critique**. ([GitHub](https://github.com/nutlope/hallmark?utm_source=chatgpt.com))

They're effectively lint rules for design.

Instead of asking

> is this valid HTML?

they ask

> does this *feel statistically average*?

Examples of the kinds of things they'd likely reject include:

- generic centered hero
- obvious gradient blobs
- glass cards everywhere
- CTA in expected location
- repeated border radius
- identical card grids
- bland hierarchy
- generic font pairing

The exact rules aren't the point.

The point is

**Hallmark defines negative constraints.**

This is unusual.

Most prompting tells the model what to produce.

Hallmark spends enormous effort telling the model

what **not** to become.

---

# Self critique

Before emitting the page the skill critiques itself.

Again, not

"Is the HTML correct?"

Instead

"Does this look like every AI landing page?"

That's a different optimization target.

---

# The verbs

This is one of the clever parts.

Hallmark isn't one workflow.

It exposes four verbs.

---

## 1. Default

Build.

```
hallmark
```

This creates something entirely new.

Pipeline:

```
brief

↓

architecture

↓

theme

↓

slop detection

↓

output
```

---

## 2. Audit

```
hallmark audit
```

Audit does **not** redesign.

It scores existing work.

Output is essentially

- anti-patterns
- violations
- weak hierarchy
- generic fingerprints
- recommendations

Importantly:

**No edits.**

It's a reviewer.

---

## 3. Redesign

```
hallmark redesign
```

This is my favorite.

It keeps

- content
- IA (information architecture)
- brand

while replacing

- structure
- visual identity
- composition

So the information survives.

The presentation is rebuilt.

This separation between

content

and

presentation

is very deliberate.

---

## 4. Study

```
hallmark study
```

This is the most sophisticated.

Input:

- screenshot

or

- URL

Output:

Not

> "copy this"

Instead it extracts design "DNA," such as:

- macrostructure
- typography pairings
- spacing language
- color anchors
- layout principles

It explicitly refuses pixel-perfect cloning or paid-template copying. Optionally it emits a portable `design.md` describing the extracted design language for reuse by other AI tools. ([GitHub](https://github.com/nutlope/hallmark?utm_source=chatgpt.com))

That is a huge distinction.

It is learning

**style**

not

pixels.

---

# Why it works

Hallmark succeeds because it externalizes design cognition.

Instead of hoping the model internally reasons through

- composition
- typography
- hierarchy
- rhythm

it serializes that reasoning into explicit procedures.

That is exactly what good skills should do.

---

# The deeper pattern

This is actually what caught my attention because it aligns with many of the ideas we've discussed about agent engineering.

Hallmark is **not primarily a design skill.**

It is an example of:

> **Externalized expert cognition.**

The repository contains:

- heuristics
- decision trees
- evaluation criteria
- failure detectors
- planning rules

The LLM supplies the creativity.

The skill supplies the judgment.

---

# Why I think it became popular

I don't think people are starring it because it makes prettier landing pages.

They're recognizing a more general pattern:

```
Human expertise

↓

encode decision process

↓

encode evaluation process

↓

encode failure detection

↓

agent executes
```

That's reusable far beyond design.

---

# Where I think Hallmark stops

This is where I think your work begins.

Hallmark is fundamentally **generative guidance**.

It tells the model:

- how to think
- what to avoid
- how to critique itself

But it does **not** create a formal semantic representation of design.

From what I can see, there is no explicit intermediate representation (IR) of concepts like:

- composition
- balance
- visual hierarchy
- rhythm
- typography relationships
- semantic intent

Those remain implicit in the prompt instructions rather than first-class objects.

That's a major distinction from the direction you're taking with **DomainForge** and **SEA-Forge**, where the goal is to encode domain semantics into structured artifacts that can be reasoned about, validated, transformed, projected into multiple targets, and instrumented. Hallmark is a highly refined procedural playbook; your approach aims for a semantic substrate that procedural playbooks can operate on.

So my concise model is:

- **Hallmark** = expert procedural knowledge for design generation.
- **DomainForge/SEA-Forge** = semantic representations plus executable domain knowledge that can generate, validate, observe, and evolve systems.

That's the understanding I'd use if I were explaining Hallmark's architecture or comparing it to your work.

---

**Sources:**

- [GitHub - Nutlope/hallmark: Anti-AI-slop design skill for Claude Code, Cursor, and Codex. · GitHub](https://github.com/nutlope/hallmark?utm_source=chatgpt.com)

## Prompt:
7/26/2026, 1:34:49 PM

I want to adapt it isomorphically to work for code based Ai slop. It’s currently concerned with design. I want to tweak it so it can be concerned with code. An analog.

## Response:
7/26/2026, 1:34:52 PM

The right move is to preserve Hallmark’s operating structure—not merely swap “design” words for “code.” I’m mapping each mechanism, verb, and quality gate to its code analogue, then I’ll show where a literal translation would fail.

> **Researching Hallmark skill repository specifics**
>
> [Nutlope/hallmark: Anti-AI-slop design skill for Claude Code ...](https://github.com/nutlope/hallmark)
> [Hallmark Channel TV Official Site](https://www.hallmarkchannel.com/)
> [Hallmark Design Skill: Anti-AI-Slop UI for Agents (2026)](https://explainx.ai/blog/nutlope-hallmark-anti-ai-slop-design-skill-july-2026)
> [Hallmark Greeting Cards, Gifts, Ornaments, Home Decor & Gift ...](https://www.hallmark.com/)
> [This open-source AI design skill makes your AI-generated ...](https://www.linkedin.com/posts/rammcodes_this-open-source-ai-design-skill-makes-your-activity-7484634438216155136-1xGt)
> [Hallmark+ | Exclusive Series & Movies + Rewards](https://www.hallmarkplus.com/)
> [Together AI Just Open-Sourced the Skill That Kills Claude's ...](https://www.youtube.com/shorts/qyCUHHoNQPU)
> [If you're tired of every AI-generated UI looking like the ...](https://www.threads.com/%40sergeinboca/post/DaxcSFzIIj2/if-youre-tired-of-every-ai-generated-ui-looking-like-the-same-shadcn-dashboard/)
> [Hallmark](https://www.facebook.com/Hallmark/)
> [Hallmark Stops AI From Building the Same Website Twice](https://medium.com/%40creativeaininja/hallmark-stops-ai-from-building-the-same-website-twice-5a50ed1947a6)
> [hallmark | Cyrus Skill](https://www.atcyrus.com/skills/hallmark)
> [Hallmark (@hallmark) • Instagram photos and videos](https://www.instagram.com/hallmark/?hl=en)
> [Hallmark — A design skill that refuses to look AI-generated](https://www.usehallmark.com/)
> [Home | Hallmark Corporate Information](https://corporate.hallmark.com/)
> [Design Anti-Slop: Claude Code Skill for Authentic UI/UX](https://mcpmarket.com/tools/skills/design-anti-slop)
> [MaestroMotif: Skill Design from Artificial Intelligence Feedback](https://arxiv.org/abs/2412.08542)
>
> **Searched 16 websites**
>
> 
>
> Worked for 12s

Yes. The correct analogue is **not “Hallmark, but with coding best practices.”** That would collapse into another generic linting/review skill.

The stronger concept is:

> **A code-generation skill that detects and prevents the recurring structural fingerprints of AI-generated code.**

Hallmark fights **design convergence**: different briefs producing the same centered hero, card grid, gradients, and styling vocabulary.

Your analogue fights **implementation convergence**: different requirements producing the same unnecessary service layers, generic abstractions, defensive clutter, fragmented helpers, verbose comments, fake configurability, weak domain models, and locally plausible but globally incoherent code.

Hallmark’s claim is:

> Different briefs should produce different visual shapes.

The code analogue should claim:

> Different problems should produce appropriately different program structures-not the same agent-shaped architecture wearing different names.

## The isomorphic mapping

| Hallmark design concept | Code analogue |
|---|---|
| Brief | Task, requirements, constraints, repository context |
| Audience | Maintainers, users, operators, downstream callers |
| Use case | Required behavior and acceptance criteria |
| Tone | Engineering posture |
| Genre | System or change archetype |
| Macrostructure | Program architecture and control-flow shape |
| Theme | Engineering doctrine or implementation fingerprint |
| Typography | Naming, API shape, and expressive vocabulary |
| Spacing and hierarchy | Module boundaries and abstraction depth |
| Visual rhythm | Control flow and data flow |
| Brand | Repository conventions and architectural identity |
| Design slop | Code slop |
| 57 slop gates | Structural, semantic, behavioral, and evidentiary checks |
| Pre-emit critique | Diff review plus verification pass |
| `design.md` | `implementation.md`, `architecture-dna.md`, or `code-profile.md` |
| Pixel cloning refusal | Refusal to cargo-cult implementation details |
| Theme rotation | Avoidance of habitual architectural defaults |

The key translation is:

> Hallmark selects a visual structure before decorating it.  
> The code version must select a **computational structure before writing syntax**.

That means the agent should first determine:

- What kind of change is this?
- Where does authority belong?
- What state exists?
- What are the invariants?
- What is the narrowest correct abstraction?
- What evidence will prove correctness?
- What existing repository patterns are constraints versus incidental history?

Only then should it write code.

---

# The product concept

A useful working name might be **Handwritten**, **Provenance**, **Craft**, **Temper**, or **Grain**.

The central promise:

> Code that looks reasoned from the problem, not sampled from the model’s defaults.

Or more operationally:

> An anti-AI-slop engineering skill for building, auditing, restructuring, and studying codebases.

It should preserve Hallmark’s four-verb shape.

## 1. Build - default

```text
craft
```

Build a new implementation or change.

It would:

1. Inspect the repository.
2. Establish the behavioral contract.
3. Identify the change archetype.
4. Select an implementation structure.
5. Load the appropriate engineering profile.
6. Reject common AI-code defaults.
7. Implement the smallest coherent change.
8. Run tests and static checks.
9. Critique the diff.
10. Return code plus verification evidence.

The result should not merely compile. It should fit the causal shape of the problem and the existing system.

### Hallmark equivalent

```text
brief → genre → macrostructure → theme → slop test → page
```

### Code analogue

```text
contract → change archetype → computational structure
→ engineering profile → slop test → verification → patch
```

---

## 2. Audit

```text
craft audit <target>
```

Audit existing code without editing it.

This should not become a noisy style review. It should produce a ranked punch list based on actual consequences.

It would identify:

- unsupported abstractions
- unnecessary indirection
- domain leakage
- duplicated authority
- speculative extensibility
- hidden state transitions
- fake error handling
- weak or missing invariants
- comments that narrate syntax rather than intent
- excessive wrappers and pass-through methods
- fragmented logic that obscures one operation
- tests that assert implementation details
- incomplete branches hidden behind placeholders
- inconsistent use of repository patterns
- generated-code residue
- dependencies introduced without necessity
- behavior not supported by tests or evidence

The output should distinguish:

1. **Correctness risks**
2. **Maintainability costs**
3. **Architectural drift**
4. **AI-generation fingerprints**
5. **Mere stylistic preferences**

That fifth distinction matters. Otherwise the skill becomes an opinionated linter pretending taste is correctness.

### Desired output shape

```text
Finding: Parallel sources of authority

Location:
- src/config/runtime.rs
- src/runtime/bootstrap.rs

Evidence:
Both modules independently normalize the same provider configuration.

Consequence:
Behavior can diverge depending on entry path.

Classification:
Architectural drift / duplicated authority

Severity:
High

Recommended action:
Move normalization behind RuntimeConfig::resolve() and require both callers
to consume the resolved representation.

Do not change:
The external config schema.
```

That is much stronger than “consider refactoring this.”

---

## 3. Redesign → Restructure

Hallmark calls this `redesign`. For code, I would avoid `rewrite`, because agents hear “rewrite” and discard too much.

```text
craft restructure <target>
```

It should preserve:

- externally observable behavior
- public contracts unless explicitly authorized
- domain meaning
- required integrations
- data compatibility
- supported operational constraints

It may replace:

- module structure
- control flow
- state ownership
- abstraction boundaries
- dependency direction
- error model
- internal API shape
- test organization

Its contract is:

> Keep the behavior and constraints; replace the implementation fingerprint.

This is the direct analogue of Hallmark preserving copy, information architecture, and brand while replacing the visual structure.

A proper restructure must begin with characterization tests or another behavioral baseline. Without that, “preserve behavior” is merely a hope.

### Workflow

```text
observe current behavior
→ extract invariants and external contracts
→ identify structural failure
→ choose a different computational shape
→ build characterization coverage
→ restructure
→ compare behavior
→ report intentional deviations
```

---

## 4. Study

```text
craft study <repository | directory | file | URL>
```

This is potentially the most valuable verb.

It should extract the **engineering DNA** of a codebase without blindly copying it.

The study output could include:

- architecture style
- dependency direction
- state ownership model
- error-handling philosophy
- concurrency model
- boundary patterns
- domain-modeling style
- configuration strategy
- testing philosophy
- naming grammar
- module granularity
- public API conventions
- observability conventions
- security posture
- tolerated and prohibited dependencies
- extension mechanisms
- evidence requirements
- repeated patterns that appear intentional
- repeated patterns that appear accidental

It should distinguish three things:

### 1. Invariants

Patterns that must be preserved for the system to remain coherent.

### 2. Conventions

Patterns worth following for consistency but not structurally required.

### 3. Residue

Patterns that are repeated only because of history, migration, copy-paste, or previous AI output.

That distinction is the code equivalent of refusing pixel clones. The skill should extract principles, not reproduce accidents.

Optionally:

```text
craft study <target> --lock
```

could emit:

```text
.code-profile.md
```

or:

```text
engineering-dna.md
```

for use by other coding agents.

---

# Hallmark’s genre layer becomes change archetypes

Hallmark selects a genre before a theme because the same visual rules should not govern an editorial site and an enterprise SaaS product. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md?utm_source=chatgpt.com))

The code version needs the same intermediate classification.

Possible change archetypes:

- **Pure transformation** - deterministic input-to-output logic
- **Stateful domain operation** - modifies entities under invariants
- **Boundary adapter** - translates between the system and an external service
- **Workflow/orchestration** - coordinates multiple capabilities
- **Query/read model** - retrieves and shapes information
- **Infrastructure mechanism** - storage, transport, scheduling, telemetry
- **Interactive application flow** - user-driven state transitions
- **Compiler/transformation pipeline** - parse, normalize, validate, lower, emit
- **Concurrency-sensitive operation** - ordering and shared state matter
- **Safety-critical path** - failures require explicit containment and evidence
- **Repository maintenance** - migration, cleanup, dependency update, mechanical change

This controls which rules apply.

For example:

- A pure transformation should be biased toward directness and exhaustive tests.
- A workflow should make transitions and failure compensation visible.
- A boundary adapter should isolate external vocabulary.
- A compiler pipeline should preserve stage boundaries and diagnostics.
- A safety-critical path may justify redundancy that would be “slop” elsewhere.

That prevents the rubric from becoming universally minimalist.

---

# Themes become engineering profiles

Hallmark uses themes to produce distinct but coherent visual fingerprints. The direct code analogue is not a set of programming styles such as “functional,” “OOP,” or “clean architecture.” Those labels are too broad and doctrinal.

Use **engineering profiles**: bounded sets of trade-offs appropriate to a situation.

Examples:

## Direct

For small, well-bounded behavior.

- few abstractions
- colocated logic
- explicit control flow
- no speculative extension points
- low dependency count

## Domain-centered

For invariant-rich business behavior.

- behavior near domain state
- explicit domain vocabulary
- illegal states constrained
- infrastructure kept outside the model
- tests organized around rules

## Pipeline

For staged transformations.

- named intermediate representations
- explicit stage contracts
- accumulated diagnostics
- deterministic transformations
- clear parse/validate/lower/emit separation

## Boundary-hardened

For external integrations.

- translation at boundaries
- timeouts and retries explicit
- idempotency considered
- external types prevented from spreading
- failures retain operational context

## Operational

For infrastructure and long-running services.

- lifecycle explicit
- structured observability
- bounded resource use
- graceful shutdown
- degraded states represented
- health and readiness semantics separated

## Performance-constrained

For verified hot paths.

- allocation and copying controlled
- benchmark before abstraction
- data layout considered
- explicit complexity budget
- readability sacrificed only with evidence

## Evolutionary

For systems with known variation pressure.

- stable semantic core
- narrow extension seams
- compatibility explicit
- migrations first-class
- variation supported only where evidence exists

The agent chooses a profile because the problem warrants it-not to create artificial variety.

---

# What counts as AI code slop?

AI code slop is not simply bad code. It has a recognizable mechanism:

> The model substitutes high-probability coding gestures for problem-specific reasoning.

A useful taxonomy would include at least these categories.

## 1. Ceremonial abstraction

- interface with one implementation and no variation pressure
- repository wrapping another repository
- manager/service/helper layers without separate authority
- factory around a trivial constructor
- strategy pattern for one fixed behavior
- generic type parameters that never vary

## 2. Fragmentation masquerading as modularity

- one logical operation split across many tiny functions
- files created only to hold a few pass-through lines
- premature `utils`, `common`, or `shared`
- excessive private methods that force the reader to reconstruct control flow
- needless extraction of one-use expressions

## 3. Plausible incompleteness

- `TODO` left in a supposedly complete path
- empty exception handlers
- default branches that silently accept unknown states
- placeholder return values
- mocked behavior leaking into production
- “temporary” fallbacks without visibility
- tests proving only the happy path

## 4. Defensive theater

- catching exceptions that cannot be handled
- logging and rethrowing at every layer
- redundant null checks after validated boundaries
- broad retries around non-idempotent work
- validation repeated without assigning authority
- fallback behavior that hides corruption

## 5. Comment slop

```python
# Increment the counter by one
counter += 1
```

- comments restating syntax
- function docstrings generated from signatures
- prose explaining obvious control flow
- outdated implementation narration
- grand architectural claims attached to trivial code

Good comments capture:

- why this constraint exists
- why the obvious alternative is unsafe
- what external behavior must remain stable
- what invariant is not expressible in the type system

## 6. Fake configurability

- options with only one supported value
- environment variables for constants
- builders that expose meaningless combinations
- extension hooks without users
- feature flags with no lifecycle
- generic registries for fixed sets

## 7. Domain erasure

- everything represented as strings, dictionaries, or generic maps
- vocabulary replaced by CRUD terminology
- domain operations scattered across handlers and services
- invalid states representable without reason
- infrastructure models used as domain models

## 8. Architecture cosplay

- applying hexagonal architecture to a tiny script
- event sourcing without audit or temporal requirements
- CQRS without different read/write pressures
- microservice boundaries within a monolith
- dependency injection containers where constructors suffice
- elaborate DDD terminology without domain behavior

## 9. Pattern mimicry

- copying nearby architecture without checking whether its constraints apply
- using framework conventions where repository conventions differ
- importing fashionable libraries for built-in functionality
- mechanically reproducing a reference project’s file tree
- treating repeated legacy structure as intentional architecture

## 10. Diff pollution

- unrelated formatting
- broad renames
- dependency churn
- speculative cleanup
- comments rewritten unnecessarily
- public APIs changed for local convenience
- generated files modified without regeneration provenance

## 11. Evidence-free confidence

- claiming completion without running tests
- adding tests that cannot fail under the bug
- ignoring warnings
- suppressing static-analysis findings instead of resolving them
- changing concurrency behavior without stress tests
- optimizing without measurement
- asserting compatibility without comparison

## 12. Local coherence, global damage

This is perhaps the signature AI failure.

The edited file looks reasonable, but the change:

- duplicates an existing capability
- bypasses the canonical path
- creates a second source of truth
- violates dependency direction
- breaks an implicit lifecycle
- introduces vocabulary inconsistent with the domain
- solves the visible symptom rather than the governing cause

This category requires repository understanding, not just code linting.

---

# The slop test must be layered

A flat checklist of 57 rules will not be enough for code. Code quality is contextual and many rules conflict.

Use a gated hierarchy.

## Gate 1: Behavioral validity

- Does it satisfy the explicit contract?
- Are edge conditions accounted for?
- Are failure modes intentional?
- Is behavior verifiable?

Failure here blocks emission.

## Gate 2: Repository fit

- Does it use the canonical implementation path?
- Does it preserve dependency direction?
- Does it follow established authority boundaries?
- Is it compatible with supported versions and tooling?

Failure usually blocks emission.

## Gate 3: Semantic integrity

- Are domain concepts represented explicitly?
- Are invariants assigned to one authority?
- Are external and internal vocabularies separated?
- Does the abstraction match the problem?

Failure blocks or requires explicit justification.

## Gate 4: Structural economy

- Is every new abstraction earning its cost?
- Could fewer moving parts express the same behavior?
- Is logic fragmented unnecessarily?
- Has hypothetical flexibility been introduced?

Failure triggers simplification.

## Gate 5: Operational integrity

- Are failures diagnosable?
- Are resource and lifecycle concerns handled?
- Are retries, concurrency, and idempotency correct where relevant?
- Does instrumentation preserve useful semantics?

Applicable selectively.

## Gate 6: Change discipline

- Is the diff scoped?
- Are unrelated changes excluded?
- Is compatibility preserved?
- Is technical debt introduced and named?

Failure triggers patch reduction.

## Gate 7: AI-fingerprint critique

- Did the agent choose a pattern because the problem required it?
- Are any abstractions generic model reflexes?
- Are comments or tests performative?
- Could the implementation belong to almost any codebase?
- What repository-specific facts materially shaped this design?

That last question is powerful:

> **Name the repository-specific evidence that caused this implementation to take this shape.**

If the agent cannot answer, it probably generated a generic solution.

---

# The six-axis pre-emit critique

Hallmark reportedly evaluates its output across philosophy, hierarchy, execution, specificity, restraint, and variety. ([explainx.ai](https://explainx.ai/blog/nutlope-hallmark-anti-ai-slop-design-skill-july-2026?utm_source=chatgpt.com))

Those translate cleanly:

## Problem fit

Does the code’s shape follow the actual constraints?

## Authority

Is each decision, state transition, and invariant owned in one clear place?

## Execution

Is the implementation complete, correct, and operational?

## Specificity

Does it use the repository’s domain language, types, patterns, and constraints?

## Restraint

Did it add only the complexity required?

## Evidence

Can the agent demonstrate that it works and that behavior was preserved?

I would replace Hallmark’s **variety** axis with **evidence**.

Visual sameness is inherently undesirable in Hallmark’s domain. Structural sameness is not inherently undesirable in code. Reusing a proven pattern is often exactly right.

The objective is not novelty. It is **non-default specificity**.

---

# Where the isomorphism must break

This is the most important correction.

A literal Hallmark port would be dangerous in three places.

## 1. Code should not vary merely to avoid repetition

Two CRUD endpoints may appropriately have nearly identical structure. Artificial variation increases maintenance cost.

Therefore:

> Reject unreasoned sameness, not justified consistency.

## 2. “Different fingerprint” can conflict with repository coherence

Hallmark can intentionally make two pages look unlike each other. Two modules in one codebase should usually share conventions.

Therefore, the code skill must prefer:

1. repository coherence
2. problem fit
3. simplicity
4. only then structural differentiation

## 3. Taste cannot replace verification

A page can be judged perceptually. Code has hidden behavior and operational consequences.

Therefore, the skill must connect its judgments to:

- tests
- types
- static analysis
- benchmarks
- traces
- repository evidence
- behavioral characterization

Without that, the anti-slop skill itself becomes AI slop: articulate criticism without proof.

---

# The three opening questions

Hallmark asks for audience, use case, and an extreme tone before building. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md?utm_source=chatgpt.com))

The code analogue could ask:

1. **Contract** - What observable behavior must change or remain invariant?
2. **Constraint** - What matters most here: compatibility, simplicity, performance, safety, delivery speed, or evolvability?
3. **Evidence** - What must pass or be demonstrated before this is complete?

However, inside an existing repository, it should usually infer these by reading:

- issue or specification
- tests
- manifests
- architecture documents
- adjacent implementation
- CI configuration
- `AGENTS.md`
- change history where needed

The agent should ask only when material ambiguity remains.

---

# The portable artifact

Hallmark’s study mode can emit `design.md`, carrying extracted design DNA to another AI tool. ([Hallmark](https://www.usehallmark.com/?utm_source=chatgpt.com))

Your analogue should emit something like:

```markdown
# Engineering DNA

## System identity
A compiler-style Rust application that turns `.sea` source into validated
intermediate representations and provider-specific projections.

## Architectural invariants
- Parsing does not perform provider I/O.
- Semantic validation operates on normalized IR.
- Projection targets consume validated IR only.
- Diagnostics accumulate rather than fail at the first recoverable error.
- External provider vocabulary does not enter the semantic core.

## Authority map
- Syntax authority: parser
- Semantic authority: domain IR
- Provider capability authority: provider descriptor
- Projection authority: target emitter

## Dependency direction
CLI → application → semantic core
adapters → application ports
emitters → validated IR

## Change posture
Prefer explicit stages and typed representations.
Do not add generic plugin abstractions without a second proven implementation.

## Error philosophy
Domain and validation failures are structured diagnostics.
Unexpected internal failures retain causal chains.

## Test philosophy
- unit tests for transformations
- fixtures for parsing and projection
- golden tests only where output stability is part of the contract
- integration tests across parse → validate → emit

## Prohibited fingerprints
- generic `utils`
- provider conditionals in semantic core
- stringly typed intermediate state
- silent fallback for unsupported provider capabilities
- pass-through service layers
```

That artifact would be especially useful across OpenCode, Codex, Claude Code, and other agents because it externalizes repository judgment without requiring every agent to rediscover it.

---

# My recommended first implementation

Do not start by inventing 57 code-slop gates. That will produce a large, brittle taste document.

Build the analogue in three passes.

## Phase 1: Faithful structural fork

Preserve:

- four verbs
- archetype selection
- profile selection
- anti-pattern gates
- pre-emit critique
- portable study artifact

Rename and adapt:

```text
build
audit
restructure
study
```

Create perhaps 25 high-confidence gates covering:

- correctness
- repository fit
- authority
- unnecessary abstraction
- incomplete behavior
- diff discipline
- verification

Success criterion:

> The skill produces measurably smaller, more repository-specific, better-verified patches than the same agent without the skill.

## Phase 2: Language and ecosystem overlays

Keep the core language-neutral, then add references such as:

```text
references/languages/rust.md
references/languages/python.md
references/languages/typescript.md

references/change-types/compiler.md
references/change-types/adapter.md
references/change-types/workflow.md
references/change-types/domain-operation.md
```

This mirrors Hallmark’s genre/theme routing without stuffing every rule into one skill file.

## Phase 3: Evidence-backed calibration

Run paired tasks:

```text
agent without skill
vs.
agent with anti-slop skill
```

Measure:

- tests passed
- regressions introduced
- files changed
- lines added
- abstractions introduced
- unused code
- dependency additions
- reviewer findings
- time to understand the patch
- repository-pattern violations
- number of corrective turns needed

Then remove gates that do not improve outcomes.

That calibration is what turns it from a clever prompt into an engineering instrument.

# The deepest formulation

Hallmark externalizes **taste against visual regression to the mean**.

Your analogue should external

## Prompt:
7/26/2026, 1:37:45 PM

Not just implementation convergence but focused on the subset of Ai failure modes, technical debt, novice pitfalls, etc

## Response:
7/26/2026, 1:37:51 PM

Exactly. **Implementation convergence is only one symptom.** The real target is the broader class of defects produced when AI generates code without durable understanding, engineering judgment, or lifecycle awareness.

The analogue should be framed as:

> **A skill for detecting and preventing AI-amplified software failure modes.**

That includes code slop, but also technical debt, novice mistakes, false completion, architectural damage, and maintenance hazards.

## The correct scope

The skill should target the intersection of three sets:

### 1. AI-specific failure modes

Failures that arise from how language models generate code:

- locally plausible, globally inconsistent changes
- invented APIs or incorrect library usage
- confident completion claims without verification
- cargo-culted patterns
- excessive abstraction because abstractions are statistically common
- code that imitates nearby syntax without understanding system semantics
- silent assumptions about state, ordering, ownership, or lifecycle
- partial implementation hidden behind polished prose
- tests written to confirm the implementation rather than challenge it
- broad edits caused by losing task boundaries
- duplicated functionality because the model failed to discover the canonical path
- fabricated compatibility or security guarantees
- comments that rationalize generated code after the fact

### 2. Novice engineering pitfalls

Failures AI reproduces because much public code and tutorial material contains them:

- premature abstraction
- weak separation of concerns
- stringly typed domain state
- hidden coupling
- global mutable state
- broad exception catching
- poor error propagation
- configuration scattered throughout the codebase
- business rules embedded in controllers or UI handlers
- weak boundary validation
- tests focused only on happy paths
- misuse of inheritance, generics, concurrency, or dependency injection
- adding dependencies for trivial operations
- copying patterns without understanding trade-offs
- confusing “more layers” with better architecture

### 3. Technical-debt creation mechanisms

Failures that may work today but increase future change cost:

- second sources of truth
- unclear authority boundaries
- duplicated normalization or validation
- abstractions that hide rather than clarify
- compatibility burden introduced unnecessarily
- temporary paths without removal conditions
- flags without ownership or sunset criteria
- weak migration design
- incomplete observability
- unstable internal APIs leaking across modules
- tests coupled to implementation details
- unbounded retries, queues, caches, or background work
- behavior encoded in conventions rather than enforceable structures
- undocumented invariant dependencies
- changes that increase cognitive load disproportionately to capability

So the governing concept is not merely **anti-convergence**.

It is:

> **Anti-unearned code.**

Every abstraction, dependency, fallback, branch, layer, compatibility path, and operational mechanism must earn its existence through a demonstrated constraint.

---

# What the skill is actually judging

A normal linter asks:

> Is this code syntactically or stylistically acceptable?

A static analyzer asks:

> Can this code exhibit a known class of defect?

A code-review skill often asks:

> Can I suggest improvements?

Your Hallmark analogue should ask:

> **What failure in reasoning produced this code, and what future cost will it impose?**

That difference is crucial.

For example, consider this:

```python
class UserServiceInterface(Protocol):
    def get_user(self, user_id: str) -> User:
        ...

class UserService(UserServiceInterface):
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def get_user(self, user_id: str) -> User:
        return self.repository.get_user(user_id)
```

This code is:

- valid
- testable
- conventionally “clean”
- potentially complete

But the skill should ask:

- Is there more than one service implementation?
- Is the service enforcing a rule?
- Does it own a transaction?
- Is it coordinating anything?
- Is the protocol needed at an actual boundary?
- Is the repository already the correct interface?

If the answers are no, the layer is **ceremonial debt**.

The defect is not style. The defect is an abstraction introduced without a corresponding system distinction.

---

# The broader anti-slop taxonomy

The skill needs a taxonomy based on failure mechanisms, not just visual code smells.

## 1. Epistemic failures

The agent does not know something but proceeds as if it does.

Examples:

- assumes an API exists
- assumes a function is unused
- assumes a database operation is atomic
- assumes retry safety
- assumes backward compatibility
- assumes a dependency version
- assumes the repository convention from one nearby file

Required response:

> Verify, inspect, or state the uncertainty. Never silently convert uncertainty into code.

---

## 2. Context failures

The code solves the visible task without understanding the surrounding system.

Examples:

- adds a new parser when one already exists
- bypasses the canonical configuration loader
- duplicates validation
- writes directly to storage instead of using the transaction boundary
- introduces a new error type inconsistent with the system
- places domain behavior in an adapter

Required response:

> Identify the canonical path, authority owner, and dependency direction before implementation.

---

## 3. Contract failures

The agent does not define what must remain true.

Examples:

- refactors without characterizing current behavior
- changes public behavior accidentally
- handles only the supplied example
- overlooks ordering, idempotency, or persistence semantics
- returns a convenient value instead of the contractually correct one

Required response:

> State preconditions, postconditions, invariants, compatibility obligations, and failure behavior.

---

## 4. Completion failures

The output looks finished but is not operationally complete.

Examples:

- unhandled branch
- placeholder logic
- unconnected configuration
- migration without rollback or compatibility plan
- feature added without registration
- tests added but not run
- implementation added without updating generated outputs
- error handling that drops context
- feature flag introduced but never evaluated

Required response:

> Trace the feature end to end from entry point to observable result.

---

## 5. Abstraction failures

The agent creates the wrong conceptual structure.

Examples:

- interface before variation
- generic abstraction before two concrete cases
- wrapper that adds no policy
- helper that obscures domain meaning
- “manager” object with mixed responsibilities
- common module that becomes a dependency sink
- framework pattern applied despite different system pressures

Required response:

> Demand the concrete pressure that justifies each abstraction.

---

## 6. Authority failures

The system no longer has one clear owner for a rule or state.

Examples:

- validation in controller, service, and database hook
- configuration normalized in multiple modules
- duplicated status-transition logic
- cached state mutated by several components
- authorization decisions made at multiple layers
- frontend and backend separately defining the same rule

Required response:

> Assign each invariant, decision, and state transition to one authoritative location.

This should be one of the skill’s strongest gates because duplicated authority creates deep technical debt.

---

## 7. Boundary failures

External concerns leak inward or internal assumptions leak outward.

Examples:

- ORM entities used as domain objects everywhere
- HTTP response types passed into business logic
- provider-specific names embedded in the semantic core
- infrastructure errors exposed as public API behavior
- unvalidated external data trusted internally
- internal enums serialized directly without compatibility control

Required response:

> Translate at boundaries and protect the core from external volatility.

---

## 8. Failure-handling failures

The code technically “handles errors” but does not preserve correct behavior.

Examples:

- catching broad exceptions
- logging and continuing after corrupted state
- retrying non-idempotent work
- converting all errors to `None`
- fallback values that hide failure
- discarding causal chains
- swallowing cancellation
- treating transient and permanent failures identically

Required response:

> Classify failures by meaning, recoverability, and operational consequence.

---

## 9. State and concurrency failures

AI often generates sequentially plausible code for systems with temporal behavior.

Examples:

- check-then-act races
- missing transaction boundaries
- non-atomic updates
- shared mutable state without ownership
- unbounded task creation
- ignored cancellation
- deadlock-prone locking order
- cache invalidation assumptions
- inconsistent reads across async operations

Required response:

> Model ownership, ordering, atomicity, lifecycle, and cancellation explicitly.

---

## 10. Test failures

Tests exist but provide weak evidence.

Examples:

- tests mirror implementation structure
- mocks replace the behavior under test
- only happy paths covered
- assertions too broad or too shallow
- snapshot tests approve accidental output
- tests cannot reproduce the original bug
- test setup bypasses production wiring
- generated tests assert that mocked methods were called rather than outcomes

Required response:

> A test must be capable of failing for the defect it claims to prevent.

---

## 11. Observability failures

The code runs but cannot explain itself.

Examples:

- logs without identifiers
- metrics without semantic meaning
- exceptions stripped of context
- no distinction between expected rejection and system failure
- tracing at framework boundaries but not domain transitions
- silent fallback
- no visibility into retry exhaustion or degraded operation

Required response:

> Produce evidence aligned with meaningful state transitions and failure modes.

---

## 12. Change-discipline failures

The patch is broader or riskier than the task requires.

Examples:

- opportunistic cleanup mixed with behavior changes
- unnecessary renaming
- formatting unrelated files
- changing public contracts for local convenience
- introducing a framework during a bug fix
- replacing working code without baseline evidence
- dependency upgrades bundled into feature work

Required response:

> Minimize the proof surface, not merely the line count.

That means the smallest change whose correctness can be clearly demonstrated—not necessarily the fewest changed lines.

---

## 13. Security failures

AI-generated code often adds superficially plausible protections while missing threat mechanics.

Examples:

- client-side validation treated as enforcement
- insecure defaults
- secrets logged
- authorization checked after resource access
- path traversal through naive joins
- unsafe deserialization
- unbounded input processing
- command construction through string concatenation
- authentication mistaken for authorization
- error messages leaking internals

Required response:

> Identify trust boundaries, assets, attacker-controlled inputs, and enforcement points.

---

## 14. Maintainability theater

The code looks professional but increases comprehension cost.

Examples:

- verbose naming without semantic precision
- documentation generated from signatures
- excessive design-pattern terminology
- many tiny files
- configuration builders for static settings
- generic frameworks built for one local use
- “clean architecture” layers with no actual policy separation

Required response:

> Judge maintainability by reduced reasoning cost, not by visible ceremony.

---

# The core principle: detect unearned complexity and unproven correctness

The entire skill could be governed by two questions.

## Complexity test

> **What concrete constraint earns this complexity?**

Applied to:

- abstractions
- dependencies
- layers
- configuration
- concurrency
- caching
- retries
- compatibility code
- extensibility
- custom frameworks

## Evidence test

> **What evidence supports the claim that this is correct and complete?**

Applied to:

- behavior
- edge cases
- compatibility
- performance
- safety
- security
- migrations
- refactors
- concurrency
- operational readiness

Most AI slop fails one or both.

---

# The skill should separate findings by provenance

A major improvement over a generic code reviewer would be labeling **why a finding exists**.

For example:

```text
Finding:
The new ProviderManager duplicates selection logic already owned by
ProviderRegistry.

Failure origin:
Context failure + authority duplication

AI fingerprint:
Introduces a generic “manager” around a discovered local problem.

Immediate risk:
Different provider selection behavior across call paths.

Debt created:
Future providers must be registered in two locations.

Evidence:
- ProviderRegistry::resolve() already owns provider lookup.
- ProviderManager::select() independently implements matching.
- Existing callers use ProviderRegistry directly.

Recommended correction:
Extend ProviderRegistry::resolve() if new selection behavior is required.
Do not add ProviderManager.
```

That teaches the agent and the human reviewer more than a conventional severity label alone.

---

# Hallmark’s “slop gates” become reasoning gates

The gates should not merely scan the final code. They should interrupt generation at specific points.

## Before coding

- Have we located the canonical path?
- Have we identified the behavior contract?
- Have we identified authority ownership?
- Do we know the repository constraints?
- Which facts remain uncertain?
- What evidence will establish completion?

## During design

- Does each abstraction correspond to a real variation, policy, boundary, or lifecycle?
- Are we introducing a second source of truth?
- Are we solving the cause or only the visible symptom?
- Are failure and state transitions explicit?
- Are we preserving repository dependency direction?

## During implementation

- Has scope expanded?
- Have placeholders or silent fallbacks appeared?
- Are external concerns leaking inward?
- Are comments explaining intent or narrating syntax?
- Are dependencies or configuration options actually necessary?

## Before emission

- Does the implementation work end to end?
- Were tests and checks actually run?
- Can each completion claim be tied to evidence?
- What technical debt was introduced?
- What assumptions remain?
- What is the likely future maintenance failure?
- Could this patch have been generated without reading the repository?

That last question remains a strong AI-slop detector.

---

# The verbs should reflect the broader scope

The Hallmark-inspired verbs can remain, but their responsibilities should widen.

## `build`

Generate code while preventing AI-amplified failure modes.

## `audit`

Diagnose:

- correctness defects
- AI fingerprints
- novice pitfalls
- architecture violations
- technical debt
- missing evidence
- operational risks

No automatic edits.

## `restructure`

Remove accumulated structural debt while preserving characterized behavior.

## `study`

Extract repository engineering DNA, including:

- invariants
- authority map
- dependency rules
- accepted patterns
- hazardous patterns
- operational assumptions
- historical residue
- evidence expectations

I would add a fifth verb.

## `harden`

```text
craft harden <target>
```

This would not redesign the architecture unless necessary. It would focus on converting plausible code into production-worthy code by addressing:

- edge cases
- error semantics
- validation
- concurrency
- cancellation
- idempotency
- security
- observability
- resource bounds
- integration tests
- recovery behavior

That captures a common AI workflow:

> The generated implementation is structurally acceptable, but operationally naive.

Hallmark does not need this distinction because visual output does not have hidden runtime behavior. Code does.

---

# A sharper product definition

The most accurate description is:

> **An engineering judgment skill that identifies and prevents code produced through shallow pattern completion rather than system-specific reasoning.**

Its job is not to make code:

- clever
- unique
- maximally abstract
- maximally minimal
- stylistically “human”

Its job is to make code:

- problem-specific
- repository-coherent
- behaviorally complete
- operationally credible
- evidence-backed
- proportionate in complexity
- explicit about debt and uncertainty

The deepest Hallmark isomorphism is therefore not:

> visual slop → code slop

It is:

> **statistical default substituted for expert judgment**  
> becomes  
> **explicit expert judgment encoded as a reusable skill.**

Implementation convergence is one detector inside that system, not the governing target.

## Prompt:
7/26/2026, 1:51:36 PM

Given hallmark is a skill its instructions are natural language. We can make it into that without actually changing code, we can just change or engineer the context that the agent using the skill needs to produce the outcome I seek. Am I wrong?

## Response:
7/26/2026, 1:51:36 PM

You're not wrong. In fact, I think this is the correct first implementation.

The important distinction is **what Hallmark actually is**.

Hallmark is not primarily software.

It is **an externalized cognitive process** encoded as natural language.

Its "implementation language" happens to be English.

The "runtime" is Claude, Codex, GPT-5.5, Gemini, etc.

So if we think in compiler terms:

```
Hallmark

Input:
Task

↓

Natural-language reasoning program

↓

LLM inference engine

↓

Output
```

The natural language *is* the program.

---

## This is actually more powerful than code

Suppose we wrote a Rust tool.

It could detect:

- duplicate code
- cyclomatic complexity
- unused imports
- dependency graphs

It cannot ask:

> "Does this abstraction exist because the problem required it, or because the model statistically likes factories?"

That is a semantic judgment.

LLMs are actually quite good at semantic judgments when given an explicit reasoning scaffold.

Hallmark exploits exactly that.

---

## Hallmark is a cognitive architecture

People often describe Hallmark as a prompt.

I don't think that's accurate.

It's closer to:

```
working memory

↓

decision framework

↓

evaluation framework

↓

critique framework

↓

output
```

That is a reasoning architecture.

The LLM supplies inference.

The skill supplies cognition.

---

## Which means...

Your anti-slop version doesn't need to parse ASTs.

Initially.

It can literally tell the model

> Before writing code, reason this way...

For example

```
Determine:

- Where authority belongs.

- What invariants exist.

- Which repository component already owns this behavior.

- Which abstractions already exist.

- Which abstractions are statistically common but unnecessary.

- What technical debt this change introduces.

- Which assumptions remain unverified.

- What evidence will prove completion.
```

That alone changes outputs dramatically.

---

## The interesting part

Hallmark mostly changes *what the model thinks about.*

Not *how it writes CSS.*

Your skill should mostly change

what the model thinks about

before it writes Rust or Python.

---

## This fits your philosophy almost perfectly

This is actually why I think you're attracted to Hallmark.

Look at the trajectory of your work over the past several months.

You keep moving cognition **out of the model** and into artifacts.

Examples:

- `.sea`
- DomainForge
- AGENTS.md
- Semantic Envelope
- Canonical Evaluation Protocol
- SWE_SEED
- Context Kernel
- semantic exhaust
- architectural decision artifacts

Every one of these says

> Don't rely on remembering.

Instead

> Externalize cognition.

Hallmark is doing exactly that.

Just for design.

---

## The thing I would add that Hallmark doesn't

This is where I think you can substantially improve on Hallmark.

Hallmark is mostly procedural.

```
Think.

Generate.

Critique.

```

I think yours should become **reflective**.

Meaning every rule should have

### Why does this rule exist?

```
Avoid speculative abstraction.

Why?

Speculative abstraction increases future maintenance cost by creating
unnecessary stability obligations.
```

---

### Failure mode

```
Symptom

↓

Underlying reasoning failure

↓

Likely downstream cost

↓

Correction
```

Example

```
Interface with one implementation.

↓

Pattern completion.

↓

Second maintenance surface.

↓

Remove interface unless variation pressure exists.
```

Notice we're teaching engineering judgment.

Not style.

---

## Even better...

Hallmark has "slop tests."

I'd give yours something closer to

**Reasoning Interrupts.**

Rather than

```
Check for factories.
```

say

```
STOP.

What concrete variation pressure requires this interface?

If none exists,
remove it.
```

That forces deliberation before emission.

---

## I think there's an even deeper insight

I actually wouldn't call it an anti-slop skill.

That makes it sound negative.

Hallmark isn't really anti-slop either.

It's trying to encode professional design judgment.

Likewise, your goal isn't to eliminate AI mistakes.

It's to **install expert engineering judgment into the model's working memory for the duration of the task**.

That's a much more powerful framing.

The slop disappears as a consequence.

---

I think this also explains why this fits so well with your broader vision. Hallmark demonstrates that a surprisingly large amount of expert behavior can be transferred through carefully engineered natural-language cognition rather than new algorithms. That aligns closely with your recurring idea that intelligence can be improved by **externalizing and structuring reasoning**, not just by making the base model larger or changing its weights. From there, you can always add tooling later—AST analysis, repository indexing, semantic graphs, or static analysis—but the first version can already provide substantial value simply by improving the agent's reasoning process before it writes a single line of code.

## Prompt:
7/26/2026, 2:00:09 PM

Now let’s iron it out. Inspect the repo again, identify the documents with the core instructions. Like where is the file (usually markdown) with the instructions for the audits , etc, the documents we will change thier contents, not thier file names so we don’t break the code, etc. detail it all after your inspection

## Response:
7/26/2026, 2:00:11 PM

I’m tracing the repository’s actual instruction flow now: entry skill file, verb-specific guidance, references, and any scripts that assume file paths or names. The goal is to identify exactly which contents can be replaced safely without breaking dispatch.

> **Browsing GitHub for Hallmark repository skills**
>
> [SKILL.md - Nutlope/hallmark](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md)
> [Hallmark Greeting Cards, Gifts, Ornaments, Home Decor & Gift ...](https://www.hallmark.com/)
> [Hallmark Channel TV Official Site - Hallmark Movies, Shows ...](https://www.hallmarkchannel.com/)
> [hallmark - Skills - Cyrus](https://www.atcyrus.com/skills/hallmark)
> [Introducing Hallmark: Open Source UI Design Skill for AI ...](https://www.linkedin.com/posts/nutlope_announcing-hallmark-an-open-source-design-activity-7462523734868795392-oWjC)
> [Hallmark+ | Exclusive Series & Movies + Rewards](https://www.hallmarkplus.com/)
> [Hassan (@nutlope) / Posts and Replies / X](https://x.com/nutlope/with_replies)
> [Hallmark Cards](https://en.wikipedia.org/wiki/Hallmark_Cards)
> [Nutlope/hallmark — GitHub trending stats & insights](https://trendshift.io/repositories/33587)
> [Hallmark | Claude Code Skills](https://claudemarketplaces.com/skills/nutlope/hallmark/hallmark)
> [Home | Hallmark Corporate Information](https://corporate.hallmark.com/)
> [Hallmark Files](https://sourceforge.net/projects/hallmark.mirror/files/)
> [Fixing slop with Hallmark skills](https://www.youtube.com/watch?v=D8KFl8QuAy4)
> [You ever notice how every AI-built website looks the same ...](https://www.facebook.com/hyperautomationlabs/videos/together-ai-just-open-sourced-the-skill-that-kills-claudes-design-slop/1739659837414130/)
> [Hallmark – Robinsons Singapore](https://www.robinsons.com.sg/collections/hallmark)
> [Hallmark — A design skill that refuses to look AI-generated](https://www.usehallmark.com/)
> [A General Technique for Non-blocking Trees](https://arxiv.org/abs/1712.06687)
>
> **Searched 17 websites**
>
> 
>
> **Fetched repository tree listing**
>
> 
>
> **Cloning Hallmark Repository and Listing Files**
>
>
> **Cloned Hallmark repository and listed files**
>
> 
>
> **Searching the web**
>
> [GitHub - Nutlope/hallmark: Anti-AI-slop design skill for Claude Code, Cursor, and Codex. · GitHub](https://github.com/nutlope/hallmark)
>
> **Searched 1 website**
>
> 
>
> **Inspected Hallmark study references, scripts, and dependencies**
>
> 
>
> Worked for 43s

Your basic strategy is correct: **fork the repository, preserve its file paths and dispatch vocabulary, and replace the natural-language design cognition with software-engineering cognition.**

The installable skill is almost entirely the directory:

```text
skills/hallmark/
├── SKILL.md
└── references/
```

The npm package explicitly declares `skills/hallmark/SKILL.md` as the entry point and `skills/hallmark/references` as the reference directory. The only package script serves the demonstration website; there is no code runtime implementing audit, redesign, or study. ([GitHub](https://github.com/nutlope/hallmark)) 

That means the operative system is:

```text
Agent loads SKILL.md
        ↓
SKILL.md recognizes a verb and task scope
        ↓
SKILL.md instructs the agent to load selected reference files
        ↓
Those Markdown files shape inspection, reasoning, output, and edits
```

## The core instruction files

### 1. `skills/hallmark/SKILL.md`

This is the **skill kernel, router, shared policy layer, and default workflow**.

It currently contains:

- skill metadata and activation description
- the four-verb interface
- verb routing
- ambiguity handling
- common rules across every verb
- component-versus-page scope detection
- the default design workflow
- context questions
- theme and genre dispatch
- reference-loading instructions
- output requirements
- project-memory behavior
- file-safety rules
- pre-emit critique
- final artifact stamping

The repository itself says that the rule set lives in `SKILL.md` and `references/`. ([GitHub](https://github.com/nutlope/hallmark))

Its frontmatter currently identifies the skill as `hallmark`, describes the situations that activate it, and gives version `1.1.0`. The body then defines the default behavior and `audit`, `redesign`, and `study`. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md))

### What must change

Almost all of its body.

We would transform:

```text
design brief
→ software change request

component/page scope
→ local change / subsystem / repository scope

genre
→ change or system archetype

macrostructure
→ implementation or computational structure

theme
→ engineering posture or risk profile

design slop
→ AI-amplified engineering failure modes

pre-emit visual critique
→ pre-commit engineering critique

design stamp
→ engineering evidence or provenance summary
```

### What should remain stable initially

Preserve:

```text
skills/hallmark/SKILL.md
```

Also preserve the frontmatter `name: hallmark` during the first adaptation if the immediate goal is to install and invoke it exactly as Hallmark. Changing the displayed description is safe, but changing the name could alter discovery, invocation language, or install expectations in some harnesses.

Preserve these user-facing verbs initially:

```text
hallmark
hallmark audit
hallmark redesign
hallmark study
```

We can reinterpret `redesign` as restructuring/refactoring internally while retaining the literal token `redesign`.

### Important warning

`SKILL.md` contains many direct Markdown links such as:

```markdown
[references/slop-test.md](references/slop-test.md)
[references/verbs/audit.md](references/verbs/audit.md)
```

Those paths form the skill’s equivalent of imports. **Changing file contents is safe; changing file names or directories requires updating every incoming reference.**

---

# Verb-specific instruction files

## 2. `skills/hallmark/references/verbs/audit.md`

This is the dedicated audit protocol.

It is surprisingly small: approximately 25 lines. It tells the agent to inspect the user’s files and report each finding as:

- named anti-pattern
- location
- severity
- concrete fix

It prohibits edits, groups findings by severity, requires a final count, checks structural fingerprints, checks whether page stamps match reality, applies genre-aware exceptions, and checks projects against `design.md`. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/verbs/audit.md))

The core current behavior is effectively:

```text
Read target
→ compare against anti-pattern vocabulary
→ classify severity
→ locate evidence
→ prescribe correction
→ do not edit
```

### This is the primary file for the new code audit

Keep the path:

```text
skills/hallmark/references/verbs/audit.md
```

Replace its contents with a protocol such as:

```text
Inspect repository context before grading.
Read applicable project instructions and architecture artifacts.
Locate the canonical path and authority owner.
Classify each finding by failure mechanism.
Cite file and line evidence.
Separate correctness risk from technical debt and stylistic preference.
Do not edit.
```

Its output structure should become something like:

```text
Finding
Failure mechanism
Evidence
Location
Immediate consequence
Debt trajectory
Severity
Confidence
Correction
Verification
```

This file should define **audit procedure**, not contain the entire catalogue of defects. The defect catalogue belongs in `anti-patterns.md`, while pass/fail gates belong in `slop-test.md`.

---

## 3. `skills/hallmark/references/verbs/redesign.md`

This is the dedicated transformation protocol.

It is much larger-roughly 269 lines-and contains substantial operational detail. It begins by defining redesign as replacing visual structure while preserving content and implementation boundaries. It then defines non-destructive rules, single-page versus multi-page routing, project inspection, system extraction, artifact generation, and implementation sequencing. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/verbs/redesign.md))

### Code analogue

Keep:

```text
skills/hallmark/references/verbs/redesign.md
```

Change its semantic meaning to:

> Restructure code to remove AI-amplified failure modes and technical debt while preserving characterized behavior and authorized contracts.

The isomorphic translations should be:

| Existing redesign concept | Code equivalent |
|---|---|
| Preserve copy, brand, IA | Preserve behavior, domain meaning, public contracts |
| Replace visual structure | Replace internal implementation structure |
| Single-page scope | File/module/local-change scope |
| Multi-page scope | Subsystem/repository-wide scope |
| `design.md` first | Engineering profile or architecture DNA first |
| Design tokens | Shared rules, types, interfaces, invariants |
| Existing route tree | Existing public API and integration topology |
| Do not bulldoze production files | Do not perform broad rewrites or deletions without authorization |
| Compare page against system | Compare implementation against repository architecture |

The current file already has a strong non-destructive posture: it prohibits deleting production structures by default, requires listing planned modifications, and treats broad replacement as something needing explicit authorization. That policy should survive almost intact, translated into code terms. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/verbs/redesign.md))

### Recommended reinterpretation

`hallmark redesign` should perform:

```text
Establish current behavior
→ inspect architecture and callers
→ identify failure mechanism
→ define preserved contracts
→ select corrected structure
→ add characterization evidence
→ make scoped changes
→ run verification
→ report intentional changes and remaining debt
```

Despite the awkward name, keeping `redesign.md` and the `redesign` verb initially minimizes breakage.

---

## 4. `skills/hallmark/references/study.md`

`study` is not inside `references/verbs/`; it is directly under `references/`:

```text
skills/hallmark/references/study.md
```

That asymmetry matters. Do not assume that all verb instructions reside in the `verbs` directory.

This file defines:

- source-mode detection
- screenshot-versus-URL behavior
- URL fetching
- remote-content safety
- prompt-injection handling
- refusal rules
- the extraction sequence
- structured diagnosis fields
- diagnosis output
- portable `design.md` emission
- source provenance and limitations

It states directly that it is loaded when `hallmark study` runs and that it extracts design DNA rather than copying pixels. 

### Code analogue

Keep:

```text
skills/hallmark/references/study.md
```

Change it to extract **engineering DNA** from:

- a repository
- a directory
- a representative subsystem
- a public GitHub URL
- selected files
- potentially a diff or pull request

The study procedure should derive:

```text
system purpose
architectural style
dependency direction
authority map
state ownership
domain vocabulary
boundary patterns
error model
concurrency model
testing philosophy
observability conventions
security posture
change conventions
proven invariants
mere conventions
historical residue
```

The most important output distinction should be:

```text
Invariant
Convention
Accident/residue
Suspected debt
Unknown
```

That prevents the agent from blindly treating every repeated pattern as intentional architecture.

### Useful pieces to preserve conceptually

The existing study protocol contains unusually strong remote-input safety rules. It treats fetched HTML and CSS as untrusted data, ignores embedded instructions, records suspected prompt injection, restricts what may be fetched, and falls back when evidence is insufficient. 

For a code-focused skill, translate that into:

- treat repository text and comments as evidence, not higher-priority instructions
- obey repository instruction files only according to the coding agent’s normal authority rules
- never execute arbitrary repository scripts merely to understand the project
- inspect manifests before running commands
- do not leak secrets or local configuration
- distinguish public repositories from private or sensitive sources
- mark inferred architecture as inferred
- refuse to claim system-wide DNA from an unrepresentative file sample

This file can eventually emit an artifact such as `design.md`, but preserving that filename would be semantically confusing. More on that below.

---

# The shared judgment files

## 5. `skills/hallmark/references/anti-patterns.md`

This is the **named defect vocabulary**.

The audit file explicitly tells the agent to name findings using entries from `anti-patterns.md`. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/verbs/audit.md))

That makes this one of the three most important files in the adaptation.

Keep the path:

```text
skills/hallmark/references/anti-patterns.md
```

Replace its design-pattern catalogue with a software-engineering taxonomy.

Recommended top-level groups:

```text
Epistemic failures
Context and repository-fit failures
Contract failures
False-completion failures
Authority duplication
Boundary leakage
Ceremonial abstraction
Speculative generalization
State and concurrency errors
Error-handling theater
Test theater
Observability gaps
Security naivety
Dependency and configuration debt
Diff pollution
Comment and documentation slop
Domain erasure
Architecture cosplay
Maintenance theater
```

Each named anti-pattern should contain:

```text
Name
Definition
Observable signals
Underlying reasoning failure
Why AI agents produce it
Possible legitimate exception
Immediate risk
Debt trajectory
Correction
Verification
```

That “legitimate exception” field is crucial. Code rules are contextual in a way visual anti-slop rules often are not.

---

## 6. `skills/hallmark/references/slop-test.md`

This is the **pre-emission gate set**.

`SKILL.md` applies it across all flows and uses it for the six-axis self-critique. It is also loaded by audit for genre-aware exceptions. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md)) ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/verbs/audit.md))

Keep:

```text
skills/hallmark/references/slop-test.md
```

This file should not merely duplicate `anti-patterns.md`.

The distinction should be:

- `anti-patterns.md`: **What failure patterns exist?**
- `slop-test.md`: **What questions must be answered before output is accepted?**

Recommended gate families:

### Gate A - epistemic integrity

- Did the agent verify library APIs and versions?
- Which claims remain inferred?
- Did uncertainty silently become implementation?

### Gate B - behavioral contract

- What behavior changed?
- What behavior must remain stable?
- Are success, failure, and edge conditions explicit?

### Gate C - repository fit

- Was the canonical implementation path found?
- Does the change duplicate existing capability?
- Does it preserve dependency direction and ownership?

### Gate D - structural proportionality

- What concrete pressure earns each abstraction?
- What concrete pressure earns each dependency?
- Was one logical operation fragmented unnecessarily?

### Gate E - authority and state

- Is each invariant owned once?
- Are state transitions explicit?
- Are ordering, atomicity, idempotency, and cancellation addressed where relevant?

### Gate F - completion

- Is the feature wired end-to-end?
- Are placeholders, silent fallbacks, or dead branches present?
- Were generated artifacts and registrations updated?

### Gate G - evidence

- Were relevant checks actually run?
- Can each completion claim be tied to output?
- Can the regression test fail for the original defect?

### Gate H - change discipline

- Is the diff broader than the requirement?
- Were unrelated files reformatted or renamed?
- Was technical debt introduced, and is it named?

The pre-emit axes should probably become:

```text
Correctness
Repository fit
Semantic integrity
Restraint
Operational credibility
Evidence
```

Implementation uniqueness should **not** be an axis. Consistency may be desirable in code.

---

## 7. `skills/hallmark/references/contract.md`

This file governs safe interaction with existing projects. `SKILL.md` references it around stylesheet and output-contract behavior. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md))

Keep:

```text
skills/hallmark/references/contract.md
```

Repurpose it as the **repository mutation contract**:

- inspect before editing
- list expected files
- preserve public behavior unless authorized
- do not delete or rename broadly without approval
- do not replace established frameworks casually
- avoid unrequested dependency changes
- run repository-native checks
- distinguish generated from source files
- preserve lockfile consistency
- never claim checks passed unless run
- report failed or unavailable verification
- do not conceal introduced debt

This will be one of the load-bearing shared files.

---

## 8. `skills/hallmark/references/structure.md`

Currently, Hallmark uses it to enforce structural variety rather than superficial visual variation. `SKILL.md` identifies this as a central differentiator. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md))

Keep:

```text
skills/hallmark/references/structure.md
```

Repurpose it to teach the agent how to infer the **causal structure of a software change**:

- pure transformation
- stateful domain operation
- boundary adapter
- query/read model
- workflow/orchestration
- compiler pipeline
- lifecycle-managed service
- concurrent operation
- migration
- repository maintenance

It should answer:

> What computational shape does this problem actually have?

This is where we prevent the model from wrapping every task in the same service/repository/factory/controller arrangement.

---

## 9. `skills/hallmark/references/macrostructures.md`

This appears to be the index for available page macrostructures, while the `references/macrostructures/` directory holds individual structures. ([GitHub](https://github.com/Nutlope/hallmark/tree/main/skills/hallmark/references))

Keep both:

```text
skills/hallmark/references/macrostructures.md
skills/hallmark/references/macrostructures/
```

Reinterpret “macrostructure” as **implementation topology** or **change structure**.

Possible documents inside that directory could map existing filenames’ contents to code structures, but this is where preserving filenames becomes awkward. For example, a file called `bento-grid.md` would be a terrible name for a compiler pipeline instruction.

There are two safe approaches:

### Conservative first fork

Do not use the existing macrostructure subfiles. Rewrite `macrostructures.md` to define code structures inline and stop loading the visual subfiles.

This preserves files without depending on them.

### Cleaner later fork

Create new code-specific files and update all Markdown references deliberately.

For example:

```text
references/macrostructures/
├── pure-transformation.md
├── domain-operation.md
├── boundary-adapter.md
├── workflow.md
├── compiler-pipeline.md
├── lifecycle-service.md
└── migration.md
```

This is technically safe because there is no compiled code depending on these names, but it is a larger content-graph migration and should be done after the initial behavior works.

---

# The files that currently encode routing dimensions

## 10. `references/genres/`

The repository currently has a genre directory; at the inspected revision it contains at least `atmospheric.md`. ([GitHub](https://github.com/Nutlope/hallmark/tree/main/skills/hallmark/references/genres))

Genre should become **task or system archetype**.

Possible semantic reinterpretations:

```text
atmospheric.md
→ high-uncertainty or exploratory change profile
```

But that would be opaque and difficult to maintain.

My recommendation is:

- initially stop relying on visual genre files
- put the new archetype routing in `structure.md`
- later add clearly named files after updating links

There is no value in preserving meaningless filenames merely because they existed.

The actual compatibility constraint is not “never rename anything.” It is:

> Never rename a referenced file without also updating every reference and validating installation.

Since this repository is natural-language driven, references are the dependency graph.

---

## 11. `references/themes/`

Themes currently carry coherent design systems.

Their code analogue is an **engineering posture**, for example:

- direct
- domain-centered
- boundary-hardened
- operational
- performance-constrained
- migration-safe
- compatibility-preserving
- exploratory

Again, preserving 20 design-theme filenames while putting engineering rules inside them would create semantic debt.

For the first version, I would **remove theme dispatch from `SKILL.md` without deleting the directory**. Leave the files present but unreachable. Then introduce engineering profiles inside one new or repurposed stable file.

The safest existing candidate is:

```text
references/custom-theme.md
```

But that name is misleading. Better eventually to add:

```text
references/engineering-profiles.md
```

Adding a new Markdown file does not break anything. We would then modify `SKILL.md` to load it.

---

# Files that are strongly design-specific

These can remain physically present but should no longer be loaded by the code-focused skill:

```text
assets.md
color.md
copy.md
custom-craft.md
custom-theme.md
design-md.md
export-formats.md
floating-nav.md
hero-enrichment.md
imagery-kit.md
interaction-and-states.md
layout-and-space.md
microinteractions.md
motion.md
responsive.md
typography.md
preview-examples.md
component-cookbook.md
references/components/*
references/themes/*
```

They will not affect agent behavior unless `SKILL.md` or another loaded reference instructs the agent to read them.

This is important:

> We do not need to delete irrelevant files to deactivate them. We only need to remove their incoming references from the active instruction graph.

That is safer for the initial fork.

---

# The `design.md` issue

Hallmark uses `design.md` as a portable design-system artifact. Audit and redesign explicitly inspect it. ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/verbs/audit.md)) ([GitHub](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/verbs/redesign.md))

For code, useful names would be:

```text
engineering-dna.md
architecture-profile.md
implementation-profile.md
```

However, changing that output name does not break package execution. It only requires synchronizing all references in:

```text
SKILL.md
references/study.md
references/verbs/audit.md
references/verbs/redesign.md
references/design-md.md
```

For the first functioning adaptation, we could retain:

```text
design.md
```

but redefine it as **software design**, not visual design. That is defensible:

```markdown
# Software Design - Project

## System purpose
## Architectural invariants
## Authority map
## Dependency direction
## Domain vocabulary
## State model
## Boundary rules
## Error philosophy
## Testing contract
## Observability contract
## Security constraints
## Accepted patterns
## Prohibited patterns
## Known debt
```

This avoids changing the output filename while still giving it an accurate software meaning.

Later, once the fork’s identity is established, rename it through a coordinated migration.

---

# What does not control skill behavior

The following repository areas are not the runtime instructions for the coding agent:

```text
docs/
site/
README.md
ROADMAP.md
vercel.json
```

The README describes installation and behavior. The `site/` directory powers examples and the demonstration website. `package.json` packages the `skills` directory and serves the site, but it does not implement the verbs. ([GitHub](https://github.com/nutlope/hallmark)) 

Changing these may be necessary for branding and documentation, but it will not produce the desired agent behavior.

The actual behavior change must occur in:

```text
skills/hallmark/SKILL.md
skills/hallmark/references/**
```

---

# Recommended modification tiers

## Tier 1 - must rewrite

These define the new skill’s actual cognition:

```text
skills/hallmark/SKILL.md
skills/hallmark/references/anti-patterns.md
skills/hallmark/references/slop-test.md
skills/hallmark/references/verbs/audit.md
skills/hallmark/references/verbs/redesign.md
skills/hallmark/references/study.md
skills/hallmark/references/contract.md
skills/hallmark/references/structure.md
```

## Tier 2 - should rewrite or replace

These define specialized routing and portable context:

```text
skills/hallmark/references/macrostructures.md
skills/hallmark/references/macrostructures/*
skills/hallmark/references/design-md.md
skills/hallmark/references/custom-craft.md
skills/hallmark/references/custom-theme.md
skills/hallmark/references/export-formats.md
```

## Tier 3 - disable by removing references

These are visual-domain support files:

```text
references/components/*
references/themes/*
assets.md
color.md
copy.md
floating-nav.md
hero-enrichment.md
imagery-kit.md
layout-and-space.md
microinteractions.md
motion.md
responsive.md
typography.md
component-cookbook.md
preview-examples.md
```

## Tier 4 - documentation and packaging cleanup

After the adapted skill works:

```text
README.md
ROADMAP.md
package.json metadata
docs/*
site/*
```

---

# The safest conversion strategy

Do not begin by editing every Markdown document.

First create an **active instruction graph**:

```text
SKILL.md
├── anti-patterns.md
├── slop-test.md
├── contract.md
├── structure.md
├── verbs/audit.md
├── verbs/redesign.md
└── study.md
```

Rewrite those eight files and make `SKILL.md` reference only them.

Leave every other file untouched and unreachable.

That gives us a minimal coherent version without:

- broken links
- contradictory design instructions
- unnecessary renames
- wasted work translating irrelevant visual details
- hidden theme or component rules leaking into code behavior

## Success criterion

After the first conversion, the agent should be able to run:

```text
hallmark <coding task>
hallmark audit <code target>
hallmark redesign <code target>
hallmark study <repository>
```

and no active instruction should mention:

- colors
- typography
- heroes
- cards
- page layouts
- themes
- visual rhythm
- CSS tokens
- screenshots as the primary design source

The strongest first move is therefore **not a whole-repository word substitution**. It is a controlled rewrite of the eight-file cognitive kernel while preserving the package entry path and verb paths.

---

**Sources:**

- [GitHub - Nutlope/hallmark: Anti-AI-slop design skill for Claude Code, Cursor, and Codex. · GitHub](https://github.com/nutlope/hallmark)

## Prompt:
7/26/2026, 2:14:10 PM

Visual themes could be stuff you can see is wrong when you look at it. For example the codebase is documented as following a certain architectural pattern but by the way the folders are organized doesn’t agree

## Response:
7/26/2026, 2:14:14 PM

Yes—that is a better analogue for Hallmark’s **visual layer**.

I was treating “themes” too narrowly as alternative coding styles. The stronger mapping is:

> **Visual appearance → directly observable repository structure.**

A codebase has a visible surface before anyone deeply interprets its implementation:

- directory tree
- package boundaries
- dependency graph
- file naming
- module sizes
- public exports
- import direction
- test placement
- configuration placement
- duplicated directory structures
- generated/source separation
- architecture documentation
- build and workspace organization

These are the codebase’s **architectural morphology**. Like visual design, they can be inspected first and often reveal that the claimed system and the actual system disagree.

## The architectural “screenshot test”

Suppose the documentation says:

> This repository follows hexagonal architecture.

But the tree looks like:

```text
src/
├── controllers/
├── services/
├── repositories/
├── models/
├── utils/
└── config/
```

That does not prove the architecture is wrong, but it gives us no visible evidence of:

- ports
- adapters
- application boundaries
- domain isolation
- dependency inversion
- inbound versus outbound concerns

Then imports reveal:

```text
controllers → services
services → repositories
services → ORM models
domain objects → framework annotations
```

The repository may be described as hexagonal while actually being a conventional layered application with framework-coupled business logic.

That mismatch is itself a first-class finding:

```text
Claimed architecture:
Hexagonal

Visible morphology:
Horizontal technical layers

Dependency morphology:
Application logic depends directly on persistence and framework types

Finding:
Architectural identity mismatch

Consequence:
Maintainers reason from an architecture that the implementation does not
actually enforce.
```

This is exactly analogous to Hallmark looking at a page and recognizing that its visual grammar contradicts its supposed identity.

# A better three-layer model

The skill should inspect codebases through three levels.

## 1. Surface morphology

What can we observe before interpreting detailed behavior?

- folder tree
- file naming
- module size distribution
- nesting depth
- package graph
- dependency direction
- entry points
- public exports
- where tests live
- where configuration lives
- where domain terminology appears
- whether files cluster around features or technical categories

This is the closest code analogue to visual inspection.

## 2. Structural semantics

What does the organization imply?

- where authority appears to reside
- whether domain boundaries exist
- whether packages are independently meaningful
- whether layers are real or ceremonial
- whether adapters are isolated
- whether public APIs match intended boundaries
- whether dependencies follow the claimed direction
- whether the system is organized around capabilities or framework mechanics

## 3. Behavioral reality

Does execution agree with both the visible structure and documentation?

- where rules actually execute
- who owns state transitions
- which paths bypass intended boundaries
- where transactions begin and end
- whether interfaces represent actual substitutability
- whether supposedly independent modules share hidden state
- whether tests exercise production wiring

A strong audit compares all three:

```text
documented architecture
↕
visible repository morphology
↕
runtime and dependency reality
```

Misalignment between any two becomes a finding.

# Themes should become expected morphological signatures

Hallmark themes bundle visible choices that should form a coherent design language. For code, an architectural style has a corresponding **expected visible signature**.

Not an inflexible folder template—a set of observable indicators.

## Hexagonal / ports and adapters

Expected evidence might include:

- domain or application core distinguishable from adapters
- inbound and outbound boundaries represented explicitly
- external frameworks at the edges
- core modules not importing database, HTTP, or vendor SDK types
- adapters depending inward
- composition occurring near an application entry point

Mismatch signals:

- `domain/` imports ORM entities
- use cases instantiate adapters directly
- ports exist but production code bypasses them
- every layer depends on a shared framework container
- adapters are labels applied to ordinary service classes

## Clean architecture

Expected evidence:

- dependency direction moves toward policy
- use cases are distinguishable from delivery mechanisms
- entities do not depend on infrastructure
- interface adapters perform translation
- framework code is replaceable at boundaries

Mismatch signals:

- inner layers import controllers or persistence types
- “use cases” are CRUD pass-throughs
- domain models are generated ORM records
- central dependency-injection container owns business behavior

## Vertical slice / feature-based architecture

Expected evidence:

```text
features/
├── create-order/
│   ├── command
│   ├── handler
│   ├── validation
│   └── tests
└── cancel-order/
```

- behavior grouped by capability
- limited cross-feature coupling
- shared code earns its shared status
- one feature can often be understood locally

Mismatch signals:

```text
controllers/
services/
repositories/
validators/
dtos/
```

with every change scattered across all directories.

The documentation claims vertical slices, but morphology remains horizontal layering.

## Domain-driven design

Expected evidence:

- bounded-context vocabulary appears in module and type names
- aggregates or consistency boundaries are identifiable
- domain behavior sits near domain state
- context boundaries have translation
- shared kernels are limited and deliberate

Mismatch signals:

- generic `models`, `services`, and `utils`
- CRUD vocabulary dominates
- all bounded contexts share database entities
- “aggregate” classes contain only fields
- domain rules reside in controllers or SQL hooks

## Modular monolith

Expected evidence:

- independently meaningful modules
- controlled public surfaces
- dependencies between modules visible and directional
- internal implementation hidden
- cross-module communication governed
- deployment remains unified

Mismatch signals:

- every module can import every other module’s internals
- one global `shared` package holds most behavior
- database tables form the actual coupling boundary
- modules are folders rather than enforced units
- cyclic package dependencies

## Event-driven architecture

Expected evidence:

- events are explicit semantic facts
- producers and consumers are discoverable
- schemas and versions are governed
- delivery semantics are considered
- idempotency and retry behavior are visible
- synchronous authority versus asynchronous projection is clear

Mismatch signals:

- event bus used as an indirect function-call mechanism
- generic string event names
- no ownership or schema evolution
- consumers contain primary business authority
- retries duplicate non-idempotent work
- events are emitted before transaction settlement without an outbox strategy

## Compiler pipeline

Expected evidence:

```text
source
→ parse
→ syntax representation
→ semantic analysis
→ normalized IR
→ validation
→ lowering
→ emission
```

- stages have distinct contracts
- representations evolve deliberately
- diagnostics retain source context
- emitters consume validated forms
- provider concerns do not leak into parsing

Mismatch signals:

- parser performs generation
- validation scattered throughout emitters
- strings passed between stages
- provider conditionals in semantic analysis
- no canonical intermediate representation
- stage boundaries exist only as function names

That last one is directly relevant to DomainForge.

# This should not be called “theme” internally

Hallmark’s theme concept is useful as an inspiration, but in code the accurate concept is probably:

- **architectural signature**
- **structural grammar**
- **repository morphology**
- **architectural phenotype**
- **visible architecture**
- **topological conformance**

My preference is:

> **Architectural phenotype**

Because it distinguishes:

- **genotype:** stated architecture, rules, ADRs, intended design
- **phenotype:** the structure actually expressed by folders, modules, dependencies, and runtime behavior

That gives the skill a powerful question:

> Does the codebase’s architectural phenotype express its declared genotype?

This is incisive and operational.

# Architecture can be documentation theater

A common AI and novice failure mode is **nominal architecture**:

> Something has been named, but not structurally realized.

Examples:

- folders named `domain`, `application`, and `infrastructure`
- interfaces named `Port`
- classes suffixed `Adapter`
- documents claiming DDD
- diagrams showing bounded contexts

Yet:

- dependencies run in both directions
- domain objects import framework types
- business logic bypasses use cases
- all modules mutate shared database records
- no boundaries are enforced
- every layer is available to every other layer

The skill should recognize:

> Architectural terminology is evidence of intent, not evidence of conformance.

That belongs prominently in the audit instructions.

# The morphology pass

Before reading implementation details, `audit` and `study` should perform a dedicated morphology pass.

## Step 1: Declared identity

Inspect:

- README
- architecture documents
- ADRs
- package descriptions
- module documentation
- diagrams
- `AGENTS.md`
- contribution guides

Extract explicit claims:

```text
Architecture:
Modular monolith using hexagonal boundaries

Domain organization:
Bounded contexts by top-level package

Dependency rule:
Domain cannot depend on infrastructure

Testing approach:
Unit tests around domain; integration tests at adapters
```

## Step 2: Visible phenotype

Inspect:

- tree at useful depth
- workspace manifests
- package manifests
- build files
- module declarations
- public exports
- test directories
- generated directories

Record observable structure without yet judging it.

## Step 3: Dependency phenotype

Inspect:

- imports between major modules
- package dependencies
- cyclic dependencies
- forbidden inward/outward imports
- framework leakage
- shared-module concentration
- direct cross-boundary database access

## Step 4: Behavior placement

Sample representative operations:

- command path
- query path
- state transition
- external integration
- failure handling

Determine where authority actually resides.

## Step 5: Compare claim and expression

Classify:

- **Conformant** — structure materially expresses the claimed pattern
- **Partially conformant** — pattern exists but has identifiable breaches
- **Nominal** — labels exist but operative structure does not
- **Contradictory** — actual dependencies oppose the claim
- **Unverifiable** — evidence is insufficient
- **Emergent alternative** — implementation consistently follows a different pattern than documentation claims

The last category matters. Sometimes the code is coherent, but the documentation is wrong.

# Examples of visible AI slop

There are many codebase-level defects that are visible before detailed review.

## Empty architectural costume

```text
domain/
application/
infrastructure/
presentation/
```

but each folder contains pass-through services and all depend on one another.

## Taxonomic sprawl

```text
managers/
services/
handlers/
processors/
providers/
helpers/
utils/
common/
shared/
core/
```

with no clear semantic distinction between categories.

This often appears when AI generates a new noun for every responsibility instead of discovering the domain vocabulary.

## One-file-per-gesture fragmentation

```text
create_user_request.py
create_user_validator.py
create_user_mapper.py
create_user_service.py
create_user_repository.py
create_user_response.py
```

for a trivial operation whose behavior could be understood in one or two cohesive units.

## Shared-directory gravity well

```text
shared/
├── constants
├── models
├── helpers
├── services
├── types
└── utils
```

The codebase claims modularity, but most modules depend on an increasingly authoritative `shared` package.

## Mirrored layers without real boundaries

```text
api/users/
services/users/
repositories/users/
models/users/
```

Every feature requires edits across a horizontal matrix. The visible tree reveals high change dispersion.

## Test morphology mismatch

The documentation claims domain-first testing, but the repository has:

- mostly controller snapshots
- no tests near domain modules
- integration tests that mock persistence
- unit tests organized by framework class rather than behavior

## Configuration diffusion

Configuration appears in:

- environment readers
- constants
- service constructors
- framework decorators
- startup scripts
- test fixtures

The tree alone suggests no canonical configuration authority.

# This changes how we should use Hallmark’s existing files

I previously suggested disabling the theme and macrostructure machinery. That was too aggressive.

We should preserve their **roles**, but change what they inspect.

## `themes/` → architectural phenotypes

Each file can encode:

- declared architectural intent
- expected visible signature
- expected dependency direction
- expected behavior placement
- common counterfeit versions
- legitimate variations
- conformance questions
- typical AI-generated distortions

For example:

```text
references/themes/hexagonal.md
references/themes/modular-monolith.md
references/themes/vertical-slice.md
references/themes/domain-driven.md
references/themes/compiler-pipeline.md
```

The filenames should eventually change because their semantics matter, but this is where the theme mechanism lives conceptually.

## `macrostructures/` → repository topologies

These would describe organizational shapes independent of architectural doctrine:

- feature-oriented
- layered
- pipeline-oriented
- plugin-oriented
- workspace/monorepo
- core-plus-adapters
- package-by-capability
- event-producer/consumer
- frontend/backend split
- library with thin binaries

Architecture and topology are related but distinct.

A modular monolith could be feature-oriented or core-plus-adapters. A compiler may live in a monorepo or a single package.

## `structure.md` → conformance protocol

This file should instruct the agent to compare:

```text
declared architecture
expected structural signature
observed repository topology
actual dependency graph
sampled runtime authority
```

## `study.md` → architecture extraction

Study mode should infer both:

- intended architecture
- actual phenotype

and explicitly report disagreement.

## `audit.md` → contradiction detection

Audit should include findings like:

```text
Architectural claim mismatch
Boundary expressed only nominally
Folder taxonomy without dependency enforcement
Feature organization contradicted by change dispersion
Documented source of truth bypassed in implementation
```

# The sharper idea

Your adaptation is not merely reviewing individual lines of AI-generated code.

It can judge the **visible integrity of the whole engineered artifact**.

Hallmark asks:

> Does this interface look deliberately designed, or does its visual structure reveal generated defaults?

Your code analogue asks:

> Does this repository visibly express a deliberate engineering model, or does its structure reveal accidental growth, AI pattern completion, and architectural cosplay?

That is a much stronger product. It covers:

- individual implementation defects
- visible structural incoherence
- contradiction between documentation and code
- architectural debt
- novice organizational habits
- AI-generated taxonomic clutter
- local changes that erode the system’s declared identity

The codebase itself becomes the screenshot.

## Prompt:
7/26/2026, 2:30:17 PM

Good you mentioned that. I will have to do some code changes. Hallmark is concerned with screenshots while I need it concerned with something like difffs I think

## Response:
7/26/2026, 2:30:19 PM

Yes. The natural-language skill can carry most of the judgment, but the **input substrate** changes enough that some code changes are likely necessary.

Hallmark’s `study` workflow is built around:

```text
screenshot or URL
→ extract visible design DNA
→ diagnose
→ optionally rebuild
```

Your analogue needs something closer to:

```text
diff + repository context + declared architecture
→ infer intended change
→ inspect affected structure and dependencies
→ detect AI-amplified failure modes
→ diagnose or correct
```

The diff is probably the primary object, but **a diff alone is insufficient**.

## Why the diff matters

A diff reveals the agent’s actual intervention:

- what it added
- what it removed
- what it ignored
- where scope expanded
- whether abstractions appeared without need
- whether tests were added
- whether public contracts changed
- whether comments and placeholders remain
- whether the agent duplicated existing functionality
- whether architecture drift was introduced

That makes the diff the closest analogue to Hallmark’s screenshot:

> A bounded, inspectable artifact that exposes the generated result.

But screenshots contain much of the visual result within themselves. Diffs do not contain enough context to evaluate code safely.

Consider:

```diff
+ pub struct ProviderManager {
+     registry: ProviderRegistry,
+ }
+
+ impl ProviderManager {
+     pub fn resolve(&self, name: &str) -> Result<Provider> {
+         self.registry.resolve(name)
+     }
+ }
```

The diff visibly suggests a pass-through abstraction. But to conclude that it is slop, the skill must inspect:

- whether `ProviderManager` has another responsibility elsewhere
- whether a public boundary requires it
- whether the repository consistently separates orchestration from registry logic
- whether the task specification calls for a stable facade
- whether future implementations are already planned and represented

So the actual analysis object should be:

```text
change set
+
local context
+
repository phenotype
+
declared intent
+
verification evidence
```

## A better name: the change envelope

The unit of analysis should be a **change envelope**, not merely a diff.

A change envelope contains:

```text
Task or issue
Base revision
Target revision or working tree
Unified diff
Changed files
Relevant surrounding files
Tests and check output
Repository instructions
Architecture claims
Dependency and module topology
```

The diff is the center. The rest supplies meaning.

This maps well to your Semantic Envelope concept:

> The patch is the payload; the change envelope carries the semantics required to judge it.

# The likely code changes

## 1. Replace screenshot acquisition with change acquisition

Hallmark currently detects image versus URL and then runs a design extraction protocol.

Your fork needs to accept one or more of:

```text
working tree
staged changes
commit
commit range
branch comparison
pull request
patch file
pasted unified diff
```

Typical commands:

```bash
git diff
git diff --cached
git diff <base>...<head>
git show <commit>
```

The skill can instruct an agent to run these commands, but a small harness improves consistency and portability.

A useful interface might be:

```text
hallmark audit
hallmark audit --staged
hallmark audit <commit>
hallmark audit <base>..<head>
hallmark audit <patch-file>
```

You could retain the existing user-facing verbs while changing the internal source modes.

## 2. Add repository-context collection

The harness should collect bounded context around the diff:

- changed file contents
- relevant enclosing modules
- direct callers and callees
- manifests
- repository instructions
- architecture documentation
- test configuration
- module tree
- nearby tests
- dependency edges

This must be selective. Dumping the entire repository into context would make the skill worse.

A reasonable expansion algorithm:

```text
changed file
→ enclosing module/package
→ imported local modules
→ direct local callers where discoverable
→ corresponding tests
→ governing manifest and instruction files
```

Then the language model can request more context when a finding depends on it.

## 3. Add diff parsing

The code does not need a full semantic engine initially, but it should understand:

- changed paths
- added/deleted files
- added/deleted lines
- renamed files
- binary/generated files
- hunk ranges
- old and new revisions
- whether changes are staged or unstaged

This allows findings to point to the actual intervention rather than criticizing untouched legacy code.

That distinction is essential:

> The audit should separate debt introduced by the change from debt merely encountered nearby.

Possible labels:

- **introduced**
- **worsened**
- **exposed**
- **pre-existing**
- **resolved**

## 4. Add repository-tree inspection

To support the “codebase as screenshot” idea, gather a normalized tree:

```text
depth-limited directory tree
package/workspace boundaries
source/test/generated/vendor classifications
file size or line-count outliers
```

This allows phenotype analysis such as:

- documentation says feature-oriented, but files are horizontally layered
- package claims isolation, but shared internals dominate
- compiler stages are documented, but files are grouped by technical helper type
- new diff adds another generic `utils` or `manager` location

## 5. Add architecture-claim discovery

Search likely sources:

```text
README*
ARCHITECTURE*
docs/architecture/**
docs/adr/**
AGENTS.md
CONTRIBUTING*
package/crate/module docs
*.sea
```

Extract claims, but treat them as claimed intent rather than truth.

The skill then compares:

```text
declared genotype
observed phenotype
diff-induced movement
```

The crucial question becomes:

> Does this change move the repository toward or away from its stated architecture?

## 6. Add verification capture

Collect evidence from commands such as:

- tests
- formatter checks
- linting
- type checks
- build
- dependency validation
- architecture tests
- benchmarks where relevant

The harness should record:

```text
command
exit status
stdout/stderr summary
whether the command actually ran
```

This prevents the agent from saying “all tests pass” based on inference.

# Diff-focused verbs

The four Hallmark verbs can still work.

## Default

```text
hallmark <task>
```

Implement a requested change under the anti-slop reasoning protocol.

The skill reads the repository before editing, then evaluates the resulting diff before completion.

## Audit

```text
hallmark audit <change-source>
```

Primary target: the diff.

Questions:

- What failure modes were introduced?
- What claims are unsupported?
- What existing architecture did the patch violate?
- What technical debt did it add?
- What novice assumptions does it reveal?
- What verification is absent?
- What untouched context changes the interpretation?

No edits.

## Redesign

```text
hallmark redesign <change-source>
```

Better understood internally as:

> Replace the patch’s implementation strategy while preserving its intended behavior.

This is not necessarily a repository-wide refactor. It may redesign the proposed change before merge.

For example:

```text
bad agent patch
→ infer intended behavior
→ characterize relevant contract
→ discard unearned structure
→ produce a cleaner replacement diff
```

This is a very useful analogue to Hallmark redesigning an existing page.

## Study

```text
hallmark study <repository | subsystem>
```

Study remains repository-focused rather than diff-focused.

It extracts:

- architectural genotype
- phenotype
- conventions
- invariants
- residue
- known debt patterns
- preferred evidence practices

The resulting `design.md` or engineering DNA artifact becomes context for later diff audits.

# Add a fifth verb: review

There is a case for distinguishing repository debt audit from patch review.

```text
hallmark review <diff>
```

Could mean:

> Judge only the proposed change and its consequences.

While:

```text
hallmark audit <target>
```

means:

> Assess the current state of a file, module, subsystem, or repository.

That separation is cleaner:

| Verb | Primary object |
|---|---|
| `review` | Proposed change |
| `audit` | Existing system |
| `redesign` | Existing or proposed implementation |
| `study` | Repository engineering DNA |
| default | New implementation |

However, adding a verb may require changing dispatch code or expectations. You can initially keep `audit` overloaded:

```text
audit diff
audit repository
```

and later separate them after observing usage.

# The analysis sequence for a diff

The new equivalent of Hallmark’s five-step screenshot protocol could be:

## Step 1 — Intent

Determine:

- requested outcome
- explicit acceptance criteria
- preserved behavior
- constraints
- whether the diff actually corresponds to the task

## Step 2 — Surface

Inspect the visible patch:

- files touched
- size and dispersion
- new abstractions
- new dependencies
- comments
- placeholders
- tests
- public API changes
- generated-file changes

This is the closest direct analogue to looking at a screenshot.

## Step 3 — Structure

Place the changed files in the repository morphology:

- package/module ownership
- architectural layer or capability
- dependency direction
- state and authority boundaries
- canonical path
- surrounding patterns

## Step 4 — Semantics

Trace affected behavior:

- data flow
- control flow
- error paths
- state transitions
- concurrency
- external boundaries
- invariants
- compatibility

## Step 5 — Evidence

Inspect:

- tests added or changed
- checks run
- ability of tests to catch the defect
- unsupported completion claims
- unresolved uncertainty

Then emit a diagnosis.

# Findings must be diff-relative

A common review failure is blaming a patch author for every problem in the touched file.

The skill should use a causality model.

For every finding:

```text
Did the change introduce it?
Did the change worsen it?
Did the change merely expose it?
Is it pre-existing but blocks safe implementation?
Is it outside scope?
```

Example:

```text
Finding:
Provider selection remains duplicated.

Relationship to change:
Worsened.

Evidence:
The repository already had two resolution paths. This patch adds a third
inside ProviderManager rather than consolidating them.

Why it matters:
The new feature increases divergence risk and makes future provider additions
require three coordinated edits.

Required correction:
Route the new behavior through the canonical registry and separately record
the pre-existing duplicate path as debt.
```

That is more fair and more useful than generic criticism.

# What should remain natural language versus code

## Keep in natural language

- failure-mode taxonomy
- architectural reasoning
- exception handling
- severity interpretation
- causal diagnosis
- technical-debt judgment
- novice-pattern detection
- pre-emit critique
- correction strategies
- uncertainty rules

## Implement in code

- acquiring diffs
- parsing hunks
- resolving revisions
- collecting changed files
- building a bounded tree
- locating manifests and instruction files
- gathering verification results
- basic dependency/import extraction
- packaging the change envelope
- enforcing output schemas if desired

This division is clean:

> Code acquires and structures evidence.  
> The skill interprets the evidence.

# Minimal viable code change

You do not need to build a full Git analysis platform first.

The first useful harness could produce Markdown or JSON like:

```yaml
change:
  source: working-tree
  base: HEAD
  files:
    - path: src/provider/manager.rs
      status: added
    - path: src/provider/mod.rs
      status: modified

repository:
  root: /repo
  instructions:
    - AGENTS.md
  manifests:
    - Cargo.toml
  architecture_docs:
    - docs/architecture.md

verification:
  commands:
    - command: cargo test
      status: passed
    - command: cargo clippy --all-targets --all-features
      status: failed
      summary: 2 warnings promoted to errors

diff: |
  ...
```

Then pass that envelope to the natural-language skill.

That is enough to start testing whether the cognition works.

# The strongest formulation

Hallmark uses a screenshot because its judgment object is the **visible rendered artifact**.

Your skill should use a diff because its judgment object is the **proposed transformation of a living system**.

But the precise analogue is:

```text
Hallmark:
rendered surface + design context

Code version:
change set + repository context
```

So yes, code changes are justified—not because engineering judgment must be implemented procedurally, but because the skill needs a reliable way to **observe the right artifact**. The skill remains the reasoning system; the harness supplies the change envelope it reasons over.

## Prompt:
7/26/2026, 2:42:32 PM

Let’s try taking this back one more level. I’m interested in seeing if it generalizes . Hallmarks objects was design, mine here is code, what if we made it “idea” which can be represented as a set of markdown documents in a folder like a skill or otherwise, altogether though of as an idea, hallmark for idea slop

## Response:
7/26/2026, 2:42:36 PM

Yes. That is the deeper generalization.

Hallmark is not fundamentally about design.

Your code adaptation is not fundamentally about code.

Both are instances of a more general problem:

> **An idea is represented through artifacts, but the artifacts may only simulate coherence, originality, completeness, or understanding.**

That is idea slop.

## The abstraction

Hallmark evaluates a design artifact against professional design judgment.

The code version evaluates a code change against professional engineering judgment.

The generalized version evaluates a **structured idea** against disciplined reasoning.

```text
Hallmark
object: design
failure: visual and structural AI slop
evidence: screenshot, page, design files

Code analogue
object: software change
failure: engineering and implementation slop
evidence: diff, repository, tests

General form
object: idea
failure: conceptual slop
evidence: documents, claims, diagrams, definitions, plans, specifications
```

The central object is not a Markdown file. It is the **idea-system expressed across Markdown files**.

A folder might contain:

```text
idea/
├── thesis.md
├── definitions.md
├── assumptions.md
├── architecture.md
├── mechanisms.md
├── examples.md
├── objections.md
├── evidence.md
├── roadmap.md
└── glossary.md
```

Together, those documents constitute one idea.

The generalized skill would ask:

> Does this folder contain a real, internally coherent idea, or a persuasive simulation of one?

That is an extremely useful target.

# What idea slop is

Idea slop is not merely bad writing, vagueness, or repetition.

It is:

> **The appearance of intellectual structure without the corresponding conceptual work.**

It can be polished, sophisticated, internally referenced, and still be empty.

Common forms include:

- terminology without distinction
- frameworks without causal mechanisms
- taxonomies whose categories overlap
- new names for existing concepts without added explanatory power
- principles that cannot constrain decisions
- claims that cannot be falsified
- diagrams that imply structure not present in the prose
- examples that illustrate rather than test
- assumptions hidden as definitions
- conclusions restated as premises
- abstractions that never cash out operationally
- borrowed concepts combined without resolving incompatibilities
- metaphor presented as mechanism
- comprehensiveness mistaken for depth
- proliferating documents that simulate maturity
- confident roadmap built on unsettled foundations
- elegant theory with no discriminating predictions
- strategy that lists advantages but omits trade-offs
- recursive terminology in which each term is defined through another invented term

AI is especially capable of producing this because it can generate **surface coherence faster than conceptual settlement**.

# The core object: an idea graph

A set of Markdown documents should not be treated as a pile of prose.

It should be treated as an **idea graph**.

Nodes include:

- claims
- definitions
- assumptions
- mechanisms
- entities
- relationships
- constraints
- predictions
- examples
- evidence
- decisions
- objections
- open questions

Edges include:

- supports
- assumes
- defines
- contradicts
- refines
- instantiates
- causes
- constrains
- predicts
- depends on
- operationalizes

The skill’s job is to determine whether the graph is sound.

For example:

```text
Claim A depends on Definition B
Definition B assumes Claim A
```

That is circularity.

Or:

```text
Principle P allegedly governs Decision D
but both D and its opposite are compatible with P
```

Then P is non-constraining.

Or:

```text
Framework F introduces five categories
but one example belongs equally to three categories
```

Then the taxonomy lacks discriminative boundaries.

This generalized form is much more powerful than anti-bad-writing.

# Idea genotype and phenotype

Your earlier code insight generalizes cleanly.

An idea has a declared identity:

- theory
- framework
- architecture
- method
- protocol
- strategy
- ontology
- product concept
- research program
- manifesto

That is its **genotype**.

Its documents express an observable form:

- organization
- vocabulary
- diagrams
- repeated concepts
- dependencies
- examples
- claims
- rules
- methods

That is its **phenotype**.

The skill asks:

> Does the idea’s phenotype actually express the kind of thing it claims to be?

Examples:

## Claims to be a theory

But contains:

- no causal mechanism
- no predictions
- no boundary conditions
- no disconfirming evidence

It is probably a perspective or vocabulary, not a theory.

## Claims to be an architecture

But contains:

- components
- names
- arrows

without:

- authority
- interfaces
- constraints
- dependency rules
- failure behavior

It is a conceptual diagram, not an architecture.

## Claims to be a methodology

But contains:

- principles
- phases
- inspirational language

without:

- inputs
- decisions
- procedures
- exit conditions
- evidence requirements

It is guidance, not a method.

## Claims to be an ontology

But contains:

- a glossary
- loosely related terms
- overlapping definitions

without:

- typed relationships
- identity criteria
- inclusion rules
- exclusions
- consistency constraints

It is a vocabulary, not an ontology.

That classification function alone would be valuable.

# The generalized failure taxonomy

## 1. Nominal substance

The artifact has the name of something without its necessary properties.

Examples:

- calling a list a framework
- calling a workflow an architecture
- calling categories an ontology
- calling principles a theory
- calling a prompt a protocol

Core question:

> What properties must this kind of idea possess, and are they present?

## 2. Distinction failure

New terms do not create meaningful distinctions.

Examples:

- two concepts have different names but identical consequences
- a category boundary cannot classify edge cases
- terminology is differentiated rhetorically but not operationally
- one term is simply a more impressive synonym

Core question:

> What can be said, predicted, or decided with this distinction that could not be said before?

## 3. Mechanism absence

The idea states what happens but not how or why.

Examples:

```text
semantic alignment improves agent reliability
```

without specifying:

- what is aligned
- by what process
- through which causal pathway
- under what constraints
- measured how

Core question:

> Through what mechanism does the claimed effect occur?

## 4. Circular support

The system supports itself.

Examples:

- the framework is valid because its categories reveal the framework
- a concept is defined by a second term defined by the first
- evidence is interpreted through assumptions that the evidence supposedly proves

Core question:

> Is any central claim independently grounded?

## 5. Abstraction drift

The idea changes meaning across documents.

Examples:

- “authority” means permission in one file, decision ownership in another, and epistemic confidence in a third
- “semantic” alternates between language meaning, domain structure, and metadata
- a system begins as descriptive and later becomes prescriptive without acknowledgment

Core question:

> Does each load-bearing term preserve identity across contexts?

## 6. Level confusion

Claims move between levels without justification.

Examples:

- individual cognition used to explain organizational behavior
- software architecture metaphor treated as biological mechanism
- descriptive observation turned into normative obligation
- model behavior generalized directly to institutions

Core question:

> At what level does this claim operate, and what licenses movement to another level?

## 7. Metaphor capture

A metaphor begins guiding conclusions beyond its useful range.

Examples:

- organization as organism
- code as law
- memory as storage
- cognition as computation
- business as self-driving vehicle

The metaphor may be useful, but it becomes slop when its correspondences are assumed rather than demonstrated.

Core question:

> Which properties are truly isomorphic, and where does the analogy break?

## 8. Taxonomic slop

Categories are decorative rather than analytical.

Signals:

- overlapping membership
- no exclusion criteria
- inconsistent granularity
- mixed dimensions
- categories defined by examples
- missing exhaustive coverage despite claims of completeness

Core question:

> What classification problem does this taxonomy solve?

## 9. Framework inflation

The idea accumulates dimensions, stages, layers, and principles without increased explanatory power.

Signals:

- every criticism produces a new category
- exceptions are handled by adding terminology
- the framework grows but never rules anything out
- complexity makes it harder to test

Core question:

> Which parts are irreducible, and which can be derived or removed?

## 10. Unconstrained principle

A principle sounds wise but cannot reject any action.

Examples:

- stay aligned
- preserve flexibility
- optimize contextually
- balance autonomy and control
- use the right tool for the job

Core question:

> What decision would this principle forbid?

## 11. False completeness

The document appears comprehensive because it has many sections.

Signals:

- every heading exists
- no section resolves uncertainty
- open questions are hidden
- edge cases are absent
- evidence sections contain assertions
- roadmap assumes unresolved claims

Core question:

> What remains unknown, contested, or unproven?

## 12. Evidence theater

The idea gestures toward validation without bearing real evidentiary risk.

Examples:

- illustrative examples labeled evidence
- citations that provide adjacent background but not support
- metrics chosen after the claim
- testimonials used for causal claims
- benchmark claims without comparison conditions
- internal consistency treated as empirical proof

Core question:

> What observation could count against this claim?

## 13. Operationalization failure

The idea cannot be translated into action, measurement, or construction.

Examples:

- no input schema
- no procedure
- no decision rule
- no success criterion
- no observable outputs
- no failure state

Core question:

> What would a competent person do differently after accepting this idea?

## 14. Dependency concealment

A supposedly foundational idea depends on unacknowledged prior theories.

Examples:

- importing cybernetic assumptions
- relying on DDD identity criteria
- assuming Bayesian epistemology
- treating market selection as given
- using systems terminology without choosing a systems ontology

Core question:

> What intellectual machinery is this idea borrowing?

## 15. Novelty laundering

Existing concepts are renamed and presented as invention.

This does not mean recombination is illegitimate. Recombination can be valuable.

The test is:

> What new capability, prediction, compression, or synthesis results from the new framing?

## 16. Contradiction by distribution

No single document contradicts itself, but the folder does.

Examples:

- one file says humans retain final authority
- another permits autonomous irreversible action
- a third defines the system as self-governing
- no document resolves the conflict

This is especially important because AI-generated idea systems often achieve local coherence document by document while losing global coherence.

# Hallmark’s verbs generalize well

## Default: build

```text
hallmark <idea request>
```

Build or develop an idea without falling into conceptual slop.

The workflow could be:

```text
classify idea type
→ identify necessary properties
→ establish definitions
→ expose assumptions
→ derive mechanisms
→ test distinctions
→ confront objections
→ operationalize
→ emit artifacts
```

## Audit

```text
hallmark audit <idea-folder>
```

Evaluate an existing idea system without editing it.

Findings should include:

```text
Finding
Failure type
Affected claim or document
Evidence
Why it matters
Downstream consequence
Required resolution
Confidence
```

## Redesign

```text
hallmark redesign <idea-folder>
```

Preserve the core insight while replacing weak conceptual structure.

That is a powerful operation:

> Keep what is genuinely valuable, remove nominal complexity, resolve contradictions, and reconstruct the idea into the correct intellectual form.

A supposed theory may become a framework.

A supposed ontology may become a glossary plus relation schema.

A supposed architecture may become a set of principles and a reference model.

Redesign may therefore include **reclassification**, not merely rewriting.

## Study

```text
hallmark study <idea-folder | source>
```

Extract the idea’s DNA:

- central thesis
- primitives
- distinctions
- assumptions
- mechanisms
- boundaries
- intellectual lineage
- implications
- unresolved tensions
- operational consequences

It should distinguish:

```text
explicit
strongly implied
inferred
contradicted
missing
```

That would make it useful for understanding someone else’s body of work without merely summarizing it.

# The input analogue is not a screenshot or diff

For generalized ideas, the input object is an **artifact set**.

A better term might be:

> **idea corpus**

or:

> **concept envelope**

The envelope contains:

- Markdown documents
- diagrams
- definitions
- specifications
- source references
- assumptions
- decisions
- revisions
- critiques
- examples
- related implementations

A folder is merely the container.

The skill analyzes the folder as one conceptual system.

```text
concept envelope
=
artifact set
+
declared purpose
+
idea type
+
source lineage
+
internal relationships
+
evaluation criteria
```

# It needs a type system for ideas

One major advantage of this generalization is that the skill can first classify what kind of intellectual artifact it is judging.

Possible types:

- concept
- thesis
- model
- framework
- taxonomy
- ontology
- theory
- architecture
- methodology
- protocol
- strategy
- specification
- research program
- design doctrine
- worldview

Each type has different obligations.

## Theory obligations

- defined entities
- causal or explanatory mechanism
- predictions
- boundary conditions
- falsifiability
- relation to evidence

## Framework obligations

- dimensions or components
- purpose
- application rules
- coverage
- discriminative value
- limitations

## Architecture obligations

- components
- relationships
- authority
- interfaces
- constraints
- invariants
- failure behavior
- evolution rules

## Methodology obligations

- inputs
- roles
- procedure
- decisions
- artifacts
- exit criteria
- evaluation
- failure handling

## Ontology obligations

- entities
- identity criteria
- types
- relations
- constraints
- inclusion and exclusion
- consistency

## Strategy obligations

- objective
- environment
- diagnosis
- choices
- trade-offs
- sequencing
- resource commitment
- feedback
- abandonment conditions

A huge amount of idea slop comes from evaluating every idea by generic standards rather than the obligations of its claimed type.

# The main gate: intellectual earnedness

Your earlier code principle generalizes cleanly:

> Every concept, distinction, category, mechanism, and document must earn its existence.

For each concept:

- What does it distinguish?
- What depends on it?
- What becomes impossible to express without it?
- What decision does it change?
- What prediction does it enable?
- Can it be derived from another concept?
- Does removing it reduce explanatory power?

For each document:

- What function does this document serve?
- Is that function already served elsewhere?
- Does it settle something?
- Does it constrain the rest of the corpus?
- Is it authoritative or merely descriptive?

This is almost perfectly aligned with your question from the cybernetics discussion:

> Which of these are truly irreducible, and which can be derived from the others?

That may be one of the skill’s foundational operations.

# The six critique axes

A generalized pre-emit critique could use:

## Substance

Is there a real idea beneath the terminology?

## Coherence

Do definitions, claims, and implications agree across artifacts?

## Distinction

Do the introduced concepts create meaningful separations?

## Mechanism

Does the idea explain or only label?

## Constraint

Does it rule out alternatives and guide choices?

## Evidence

What supports it, and what could disconfirm it?

I would add a seventh:

## Compression

Does the idea reduce complexity by explaining many things through fewer principles, or does it merely rename and multiply them?

That is a strong discriminator between genuine theory-building and conceptual proliferation.

# The deepest Hallmark isomorphism

Hallmark asks:

> Does the design exhibit intentional structure, or is it composed from familiar visual defaults?

The code version asks:

> Does the implementation exhibit engineering judgment, or is it composed from familiar programming defaults?

The generalized version asks:

> Does the idea exhibit settled reasoning, or is it composed from familiar conceptual defaults?

Those defaults include:

- systems language
- AI language
- complexity language
- architecture language
- strategy language
- cybernetics language
- scientific-sounding taxonomies
- diagrams with arrows
- maturity models
- principles in sets of three or five
- invented compounds and capitalized constructs

None of those are inherently bad. They become slop when they substitute for actual distinctions, mechanisms, and constraints.

# What this could become

This no longer needs to be “Hallmark for ideas” only.

It could be a general **intellectual quality skill** for creating and auditing structured bodies of thought.

Its promise could be:

> Ideas that are reasoned, not generated.

Or more precisely:

> Turn articulated concepts into coherent, testable, operational idea systems.

The crucial design choice is that it should not reward cleverness, novelty, or complexity. It should reward:

- conceptual integrity
- compression
- discriminability
- causal clarity
- operational consequence
- explicit uncertainty
- evidentiary exposure
- resistance to self-deception

That makes design and code specializations of the same underlying skill.

```text
general idea-quality kernel
├── design profile
├── software-engineering profile
├── strategy profile
├── research profile
├── architecture profile
└── methodology profile
```

The general kernel detects failures of thought.

Each profile supplies the domain-specific obligations and observable evidence.

That is likely the right ultimate architecture: **idea first, with design and code as typed projections.**

## Prompt:
7/26/2026, 3:01:25 PM

First, I’m going to clone hallmark and ask opus 5 to refactor it into the code slop version for me completely . I’ll give it this conversation for reference too. I expect it to work completely, filenames changed and all and would enable me to polish all my code bases analogous to hallmark as if it were designed for this if you get my meaning. Look up opus 5 ensure you look up how best to prompt it specifically and structure your prompt accordingly



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)