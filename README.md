<p align="left">
  <img src="assets/neatcode-wordmark.png"
       alt="NeatCode"
       width="320">
</p>

<p align="center">
  <img src="assets/neatcode-banner.png"
       alt="NeatCode — Remove the slop. Reveal the signal."
       width="100%">
</p>

### Make plausible code earn your confidence.

[![npm version](https://img.shields.io/npm/v/%40godspeedai%2Fneatcode)](https://www.npmjs.com/package/@godspeedai/neatcode)
[![license](https://img.shields.io/npm/l/%40godspeedai%2Fneatcode)](LICENSE)

AI coding agents are very good at producing code that looks finished.

That is becoming less reassuring.

The new interface fits the surrounding style. The unit test is green. The agent tells you it checked the callers. The abstraction has a respectable name. Nothing in the diff looks obviously reckless.

Three months later you discover:

```text
there were already two ways to do the same thing

the new abstraction has one implementation and no reason to exist

the test proves the mock, not the production behavior

the API used by the code does not exist in the installed dependency

the retry path duplicates an operation that is not idempotent

the new manager simply forwards calls to the registry underneath it

the code works until cancellation, concurrency, recovery,
migration, or partial failure enters the room
```

None of those necessarily look like bad code in isolation.

That is the problem.

**NeatCode is an engineering-hardening skill for AI-assisted software development. It reviews generated or existing code against the repository's contracts, invariants, failure paths, operational constraints, and tests, then hardens the implementation toward production without changing its intended behavior.**

Plainly:

> AI can produce a plausible implementation very quickly. NeatCode checks whether the implementation actually belongs in this repository and whether it can survive the conditions the happy path left out.

It works with Claude Code, Cursor, Codex, and other skill-capable coding agents.

The skill provides the engineering judgment.

A small optional CLI assembles the evidence that judgment should operate on.

---

## The dangerous code is often the code that looks reasonable

Obvious mess is relatively easy to find.

A 2,000-line function is suspicious.

A pile of copy-pasted conditionals is suspicious.

A test suite full of skipped tests is suspicious.

Modern AI-generated debt is often neater than that.

Consider this:

```text
src/providers/registry.ts
src/providers/manager.ts
```

`ProviderRegistry` already owns provider registration and lookup.

An agent needs a provider during a new feature, so it introduces `ProviderManager`.

The manager receives the registry.

Every method forwards to the registry.

The naming is clean.

The types work.

The tests pass.

The agent explains that the new layer "improves extensibility."

Nothing is broken.

Nothing has earned the extra layer either.

Now every future developer and agent has to answer:

```text
Do I call ProviderRegistry?

Do I call ProviderManager?

Which one owns lifecycle?

Which one owns validation?

Will these diverge later?

Is the distinction architectural or accidental?
```

The code just increased the number of distinctions the repository has to maintain without increasing what the system can actually do.

NeatCode looks for that kind of change.

---

## Code slop

NeatCode uses **code slop** in a specific sense:

> **Plausible code that technically works and has not earned the confidence it projects.**

That includes much more than ugly AI output.

It can be:

* unnecessary abstraction
* duplicate authority
* invented APIs
* locally correct code that violates repository architecture
* tests that confirm implementation details instead of behavior
* completion claims unsupported by actual verification
* happy-path implementations with no recovery model
* wrappers that add vocabulary but no responsibility
* defensive code that hides a broken contract
* abstractions added for hypothetical futures
* comments explaining complexity that should not exist
* "production-ready" code with no operational path through failure

A conventional linter cannot decide most of those questions.

Neither can formatting.

The issue is engineering judgment.

---

## Start with the change you are about to commit

You do not need to adopt a new development process.

Take the diff you already have.

Stage it:

```bash
git add -A
```

Build a review envelope and run the repository's proof:

```bash
neatcode envelope \
  --staged \
  --verb review \
  --verify "npm test"
```

Then ask your coding agent:

```text
neatcode review the staged changes
```

NeatCode should answer questions such as:

```text
Did this change solve the requested problem?

Did the repository already contain the needed mechanism?

Does the new structure preserve the architecture already in use?

Did the change create a second authority?

What complexity was introduced?

What concrete constraint earns that complexity?

Which failure paths now exist?

Were the relevant checks actually run?

What does the evidence establish?

What remains unknown?
```

That is the smallest useful NeatCode loop.

---

## Two questions do most of the work

NeatCode repeatedly asks two questions.

### What earned this?

Every new abstraction, dependency, state machine, interface, manager, cache, wrapper, background task, fallback, retry, or layer creates maintenance cost.

That does not make complexity bad.

It means complexity should purchase something real.

This is weak evidence:

> We may need multiple implementations later.

This is stronger:

> Two implementations exist today and callers require a stable interface across them.

Weak:

> This makes the code more flexible.

Stronger:

> Three current callers vary along this specific dimension, and the abstraction removes duplicated policy while preserving one authority.

The question is not:

> Is this pattern considered good architecture?

It is:

> **What constraint in this repository earns this structure?**

---

### What supports this claim?

AI coding agents make many claims during ordinary work:

```text
all tests pass

the existing behavior is preserved

this API is supported

this is thread-safe

the migration is backward-compatible

there are no other callers

the error is handled

the change is complete
```

Some may be true.

NeatCode asks what evidence makes them true.

A test result is evidence if the test actually ran.

A search result is evidence about the scope that was searched.

A compiler result is evidence about what the compiler checked.

An agent remembering that it "looked at the callers" is not the same kind of evidence.

NeatCode does not require certainty.

It requires claims to stop pretending they have more support than they do.

---

## A diff is not enough context to judge a diff

Imagine reviewing this addition:

```ts
class ProviderManager {
  constructor(private registry: ProviderRegistry) {}

  get(name: string) {
    return this.registry.get(name);
  }
}
```

From the diff alone, this might be:

```text
unnecessary indirection
```

or:

```text
the beginning of a deliberate stable facade
```

The code cannot tell you which.

You need the surrounding repository.

NeatCode calls that evidence the **change envelope**:

```text
requested intent
      +
diff or change set
      +
changed-file context
      +
repository instructions
      +
declared architecture
      +
observed repository structure
      +
relevant dependencies
      +
callers
      +
tests
      +
verification evidence
```

The optional CLI assembles that material deterministically.

For staged work:

```bash
neatcode envelope --staged --verb review
```

For a range:

```bash
neatcode envelope --range main...HEAD --verb review
```

For an existing subsystem:

```bash
neatcode envelope --paths src/billing --verb audit
```

For the whole repository:

```bash
neatcode envelope --repo --verb study --json
```

Ask what verification the repository already declares:

```bash
neatcode checks
```

Run the deterministic guard layer over a change:

```bash
neatcode guard --staged
```

Ask what the machine can actually do — installed agents, MCP services,
skill roots, toolchains:

```bash
neatcode environment
```

The harness gathers and structures evidence.

It does not decide whether the code is good.

That judgment remains in the skill.

---

## Six ways to use NeatCode

### Implement

The default mode.

Ask NeatCode to make a change and it first orients in the repository, identifies the contract, chooses the smallest coherent structure, implements it, then critiques the resulting diff before declaring completion.

```text
request
   ↓
repository orientation
   ↓
contract
   ↓
structure
   ↓
implementation
   ↓
verification
   ↓
critique
```

The useful constraint is that syntax comes after enough understanding to choose the structure.

---

### Review

```text
neatcode review [source]
```

Judge a proposed change.

The source can be:

* working tree
* staged changes
* commit
* commit range
* branch
* patch
* pasted diff

Findings distinguish:

```text
introduced
worsened
exposed
pre-existing
resolved
```

That distinction keeps a review from blaming the current change for every historical defect it happens to reveal.

---

### Audit

```text
neatcode audit <target>
```

Evaluate existing code without editing it.

The target may be a file, module, subsystem, or repository.

Audit looks at areas such as:

```text
architecture conformance
authority
boundaries
failure handling
tests
operational readiness
security
observability
technical debt
```

Use this when the question is:

> What condition is this subsystem actually in?

rather than:

> What should I change right now?

---

### Restructure

```text
neatcode restructure <target>
```

Preserve intended behavior while changing the implementation strategy.

NeatCode first characterizes the behavior that must survive.

That matters because a refactor that cannot state what it is preserving is just a rewrite with optimism.

---

### Study

```text
neatcode study <target>
```

Extract the repository's engineering DNA.

NeatCode separates what it finds into:

```text
invariants
conventions
residue
```

An invariant is load-bearing.

A convention is a local choice worth following for consistency.

Residue is merely something that exists.

That distinction matters for agents because repositories contain historical accidents alongside intentional architecture. Copying everything equally faithfully reproduces debt.

Study can optionally write a portable:

```text
engineering.md
```

for later agent work.

---

### Harden

```text
neatcode harden <target>
```

Take code that works on the happy path and examine what happens when reality stops cooperating.

Hardening covers concerns such as:

```text
idempotency
concurrency
timeouts
cancellation
retry behavior
partial failure
recovery
observability
security boundaries
migrations
integration wiring
resource cleanup
```

This is where NeatCode's category is clearest.

The task is no longer:

> Can this code run?

It becomes:

> **Can we rely on this code when the conditions stop being ideal?**

---

## Working code can still be wrong for the repository

AI-generated code often optimizes for local correctness.

Repositories require something stronger.

Suppose the codebase has one established authority for resolving tenant identity:

```text
TenantContext
```

A new feature introduces:

```text
TenantResolver
```

Both implementations may be correct.

The problem is now architectural:

```text
Which one decides?

Can they disagree?

Which callers use which one?

Where does policy belong?

What happens when one changes?
```

NeatCode checks whether a change creates duplicate sources of authority, crosses existing boundaries, or introduces a second vocabulary for the same responsibility.

That is why repository context matters more than whether the patch looks elegant.

---

## Architecture claims can be wrong too

Repositories regularly contain documentation describing an architecture the implementation no longer has.

NeatCode does not automatically treat documentation as truth.

Its architectural conformance protocol compares declared architecture with observed imports, call relationships, boundaries, and implementation structure.

Possible verdicts include:

```text
conformant
partially conformant
nominal
contradictory
unverifiable
coherent emergent alternative
```

That last result matters.

Suppose the README says:

```text
Controller → Service → Repository
```

but years of implementation have converged coherently on:

```text
Handler → Domain → Port
```

The software may not need to be "fixed" back into the diagram.

The cheaper and more truthful repair may be updating the documentation.

NeatCode is meant to distinguish architectural drift from architectural decay.

---

## Tests are evidence, not decoration

NeatCode does not compete with your tests.

It asks whether the tests establish the claim being made.

Suppose an agent fixes duplicate payment submission by adding a retry guard.

It also adds this test:

```text
when retry guard is true
the duplicate path is skipped
```

The test may pass.

But if production duplicate submission happens because two requests race before either writes the guard, the test proves the implementation's own assumption rather than the actual failure condition.

NeatCode looks at:

```text
the claimed behavior
the failure mechanism
the test boundary
the production path
the evidence produced
```

A green test matters.

Which claim it makes green matters more.

---

## Failure paths are part of the implementation

Generated code is often strongest where examples are plentiful:

```text
request
  ↓
success
  ↓
response
```

Production spends a great deal of time elsewhere:

```text
request
  ↓
timeout

request
  ↓
partial write

request
  ↓
cancel

request
  ↓
dependency unavailable

request
  ↓
retry after ambiguous completion

request
  ↓
two workers race

request
  ↓
process dies halfway through
```

NeatCode does not require every feature to solve every possible failure.

It asks whether the important failure paths have been considered relative to the actual consequences of the code.

A local formatting utility and a payment writer deserve different hardening burdens.

---

## Complexity should buy a capability

A useful NeatCode heuristic is:

```text
new complexity
      ↓
what new constraint can the system now satisfy?
```

Examples:

### Earned

```text
Introduce an interface because two real providers
already require different implementations.
```

### Probably unearned

```text
Introduce an interface around one implementation
because another provider might exist someday.
```

### Earned

```text
Introduce idempotency storage because retries can
duplicate an externally consequential operation.
```

### Probably unearned

```text
Introduce a distributed locking abstraction around
an operation that is local, deterministic, and never concurrent.
```

The goal is not minimalism.

It is **earned structure**.

A codebase should be as complicated as the reality it has to handle, and no more complicated merely because an agent knows more patterns.

---

## NeatCode does not replace deterministic tools

Use the compiler.

Use the type checker.

Use the test runner.

Use the linter.

Use the security scanner.

Use the schema validator.

And use NeatCode's own deterministic guards where they apply:

```bash
neatcode guard --staged
neatcode guard --paths src --language rust --json
```

They inspect JavaScript/TypeScript, Python, Go, and Rust for evidence-loss
patterns — widened-then-asserted types, unjustified escape hatches, untyped
contracts, erased evidence — through one interface, with findings labeled
introduced, worsened, exposed, pre-existing, or resolved against a baseline.

NeatCode is useful around the questions those tools cannot decide alone:

```text
Was this the right abstraction?

Is this the right authority boundary?

Did we duplicate an existing mechanism?

Does this test exercise the consequential behavior?

Did the fix increase blast radius unnecessarily?

Does the implementation fit the repository's actual architecture?

What evidence supports the completion claim?
```

When a deterministic tool can answer a question, let it.

NeatCode should consume the result rather than imitate the tool with prose.

---

## Fourteen failure families

NeatCode organizes recurring engineering failures into fourteen families:

```text
epistemic
context
contract
completion
abstraction
authority
boundary
state & concurrency
failure-handling
tests
observability
security
change-discipline
maintainability theater
```

Each family includes:

* definition
* common signals
* underlying reasoning failure
* risk
* likely debt trajectory
* legitimate exceptions
* common false positives
* likely correction
* appropriate verification

These are not meant to become a checklist the model recites against every diff.

They are progressively loaded when the evidence suggests that family matters.

---

## Completion has gates

NeatCode includes pre-completion gates across eight groups and evaluates a change across six broader dimensions:

```text
correctness
repository fit
semantic integrity
restraint
operational credibility
evidence
```

A weak dimension forces another revision pass rather than being averaged away by strengths elsewhere.

This matters because:

```text
beautiful structure
+
missing error handling
```

is still missing error handling.

And:

```text
excellent test coverage
+
a second source of authority
```

still leaves two sources of authority.

Engineering properties are not always safely interchangeable.

---

## Install

### skills.sh

For Claude Code, Cursor, Codex, GitHub Copilot, and other supported agents:

```bash
npx skills add GodSpeedAI/NeatCode
```

### Claude Code plugin

```text
/plugin marketplace add anthropics/claude-plugins-community
/plugin install @claude-community:neatcode
```

### Manual installation

Copy:

```text
skills/neatcode/SKILL.md
skills/neatcode/references/
```

to the appropriate skill location.

Claude Code:

```text
~/.claude/skills/neatcode/
```

Codex personal:

```text
~/.codex/skills/neatcode/
```

Codex project:

```text
.codex/skills/neatcode/
```

Cursor can use the `SKILL.md` body as a project rule:

```text
.cursor/rules/neatcode.mdc
```

without the skill frontmatter.

---

## Install the evidence harness

The skill works without the CLI.

The optional harness makes repository evidence easier to reproduce:

```bash
npm install -g @godspeedai/neatcode
```

This provides the:

```text
neatcode
```

command.

Without it, the skill can fall back to ordinary repository inspection such as `git diff`.

With it, statements such as:

```text
npm test was executed against this change
```

can be carried in the structured envelope instead of depending on conversational memory.

---

## Try it in five minutes

Review staged changes:

```bash
git add -A

neatcode envelope \
  --staged \
  --verb review \
  --verify "npm test"
```

Then tell your agent:

```text
neatcode review the staged changes
```

Or study a repository before asking an agent to make a larger change:

```bash
neatcode envelope --repo --verb study --json
```

Then:

```text
neatcode study this repository
```

Worked examples are available in:

* [`docs/recipes.md`](docs/recipes.md)
* [`docs/study-examples.md`](docs/study-examples.md)

---

## The skill holds judgment; the harness holds evidence

This separation is deliberate.

```text
repository
    ↓
NeatCode CLI
acquire + structure evidence
(envelope · guards · environment)
    ↓
change envelope (+ guard findings, when requested)
    ↓
NeatCode skill
engineering judgment
    ↓
finding / correction / verification requirement
```

The CLI should not gradually become a hidden rules engine attempting to encode engineering taste procedurally.

Guard findings are mechanically provable signals — this pattern exists at
this line — not verdicts about whether the code is good. The skill decides
severity, attribution, and remediation.

The skill should not pretend that a model's recollection of running a command is equivalent to machine-captured evidence.

Each side does the job it is better suited to do.

---

## Use a model capable of repository-level reasoning

NeatCode asks the model to reason beyond the visible patch.

It may need to relate:

```text
the requested change
the diff
repository instructions
architecture
callers
dependencies
tests
neighboring implementations
operational behavior
```

A model that only pattern-matches against the current diff can reproduce the exact failure NeatCode exists to catch: locally plausible advice with weak repository grounding.

For consequential reviews, use a model capable of holding the relevant repository structure and evidence together.

The envelope can provide the context.

It cannot make a model reason well about that context.

---

## Repository consistency is usually a feature

Design work often rewards novelty.

Software repositories usually do not.

If the codebase has one established way to model errors, one naming convention, one dependency-injection pattern, and one authority boundary, an agent should need a concrete reason to introduce another.

NeatCode therefore does not contain a "variety" objective.

Different is not automatically better.

Consistency lowers the amount every future human and agent has to rediscover.

---

## Style belongs to style tools

NeatCode is not interested in becoming a second linter.

If formatting is enforced by:

```text
rustfmt
prettier
black
eslint
ruff
```

let those tools own it.

An engineering skill that floods review output with formatting comments trains users to ignore the findings that actually require judgment.

NeatCode focuses on structure, behavior, evidence, and operational credibility.

---

## No source-file stamps

NeatCode does not add comments such as:

```text
// Reviewed by NeatCode
```

to source files.

A marker does not make code correct.

It also becomes stale the moment the code changes.

Review results belong in review output.

Durable repository knowledge belongs in appropriate engineering documentation such as `engineering.md`.

The source should contain information the software itself needs.

---

## Where NeatCode fits

NeatCode runs independently.

You can use it with an ordinary coding agent without adopting anything else from GodSpeed AI.

Within the broader GodSpeed architecture, NeatCode fits as a specialized SWE_SEED skill:

```text
SWE_SEED
defines the software-work contract
        ↓
coding agent
implements the change
        ↓
NeatCode
examines and hardens the implementation
        ↓
proof
shows what actually holds
```

SWE_SEED answers:

> What artifact and proof does this software task require?

NeatCode answers:

> Is the implementation actually engineered well enough to deserve that proof?

For longer work, Gauntlet can execute the route and invoke NeatCode where engineering judgment is needed.

Those integrations are optional.

---

## What NeatCode is not

NeatCode is not a formatter.

It is not a linter.

It is not a static analyzer.

It is not a test runner.

It is not a generic code-review persona.

It is not a license to rewrite working code until it matches someone's preferred architecture.

It is not a complexity-minimization contest.

It is not an automatic claim that existing repository patterns are correct.

It is not a replacement for deterministic verification.

NeatCode is an engineering-hardening skill.

It does ship deterministic guard analysis — for JavaScript/TypeScript,
Python, Go, and Rust — but as evidence feeding judgment, not as the
judgment itself. A guard finding says a pattern exists; NeatCode decides
what it means in this repository.

Its job is to help distinguish:

```text
code that looks finished
```

from:

```text
code whose structure, behavior, evidence,
and failure handling justify treating it as finished
```

---

## Derivation

NeatCode is derived from [Hallmark](https://github.com/Nutlope/hallmark), an anti-AI-slop design skill by Together AI, released under the MIT License.

It retains Hallmark's general architecture:

```text
natural-language kernel
progressively loaded references
verb dispatch
pre-emit critique
gate-based quality checks
```

The subject matter changes from design judgment to software-engineering judgment.

Two mechanisms are deliberately inverted.

### Theme rotation becomes profile inheritance

Hallmark benefits from visual variation.

Repositories generally benefit from the opposite.

A codebase should not invent a new architectural dialect merely because the agent can.

NeatCode learns and inherits the repository's engineering profile unless a real constraint earns a deviation.

### Output stamps become review records

Hallmark can stamp generated design output.

NeatCode does not stamp application source code.

A comment claiming that code was reviewed is not evidence that the current version remains reviewed.

The review belongs in the review record.

---

## The short version

AI made code generation cheap.

It did not make repository understanding, architectural judgment, failure design, or proof cheap.

NeatCode works on that remaining gap.

Understand the repository before changing it.

Make new complexity earn its cost.

Keep authority singular where it should be singular.

Test the consequential behavior, not the implementation's favorite story about itself.

Treat failure paths as part of the feature.

Run the checks you claim you ran.

Say what remains unknown.

Turn plausible code into engineered code.

---

## License

MIT.

Use it, fork it, ship it.

See [`LICENSE`](LICENSE) for the retained upstream notice.
