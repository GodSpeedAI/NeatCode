# Recipes — worked invocations

Six worked runs you can paste into Claude Code, Cursor, or Codex with the NeatCode skill
installed. Each shows the prompt verbatim, what the skill does, and an excerpt of the output.

The first is the **canonical try-it** — run it in any repository to verify the skill is wired
up and to see the shape of a report before reading anything else.

---

## 00 · Try it · review what you are about to commit

**Setup:**

```bash
git add -A
neatcode envelope --staged --verb review --verify "npm test"
```

**Prompt** (copy/paste verbatim):

> *"neatcode review the staged changes."*

**What happens.** The skill acquires the staged diff, expands one context ring per changed
file — owning package, local imports, discoverable callers, related tests, governing
instructions — reads `AGENTS.md` and any `engineering.md`, sets a depth, walks intent →
surface → structure → semantics → evidence, and labels every finding by its relationship to
the change.

**Excerpt:**

> **NeatCode · review** · staged · 3 files (+61 / −8) · depth: standard
>
> **Verdict** · The fix is correct and in the canonical path. One piece of debt introduced: a
> second place that normalizes the account identifier.
>
> **Contract read** · Trim and case-fold account identifiers before lookup, so `" ACME "` and
> `"acme"` resolve to the same tenant.
>
> **Debt introduced (S3)** · *Duplicated normalization* — `src/api/lookup.ts:88` re-implements
> the trimming and case-folding already in `src/domain/account.ts:12`, which two other call
> sites use. Two owners for one rule; they will drift on the next change. → Call
> `normalizeAccountId()` from the handler. Covered by the existing `account.test.ts` cases plus
> one asserting the handler path produces identical output.
>
> **Evidence** · `npm test` ✓ (204 passed) · `npm run typecheck` ✓
> **Critique** · correctness 4 · fit 3 · semantics 4 · restraint 5 · operations 4 · evidence 4

**Why this is the canonical try-it:** it exercises acquisition, context expansion, the
provenance label, a real finding at a severity that is neither dramatic nor dismissible, and
an honest critique score below 5.

---

## 01 · Review an agent's patch before you read it

**Prompt:**

> *"I let an agent implement the retry logic in `src/billing`. neatcode review the working
> tree before I look at it."*

**What happens.** For an agent-authored patch, the skill always loads the `epistemic` and
`context` taxonomy families — invented APIs, assumed versions, fabricated guarantees,
duplicated implementations, bypassed canonical paths. Those two families catch more real
defects in generated code than the other twelve combined.

**Excerpt:**

> **Blocking (S1)** · *Retry of a non-idempotent effect* — introduced. `src/billing/resume.ts:118`
> wraps `stripe.paymentIntents.capture()` in `withRetry(3)` with no idempotency key. `capture`
> is not idempotent without one. A timeout on a *successful* capture produces a second charge —
> invisible in tests, and it appears under exactly the conditions retries exist for.
> → Pass ``{ idempotencyKey: `resume-${subscriptionId}-${periodStart}` }``, or move the retry
> outside the capture and reconcile on the webhook. Verify with a test that forces one retry and
> asserts a single capture call.
>
> **Blocking (S2)** · *Fabricated guarantee* — introduced. The docstring at
> `src/billing/resume.ts:104` claims the operation is "atomic." It performs a database write
> and then an external API call; nothing makes those atomic. → Delete the claim or implement an
> outbox.

---

## 02 · Audit a module you inherited

**Prompt:**

> *"neatcode audit `src/billing` — I've just taken over this module and I don't know what I'm
> holding."*

**What happens.** Morphology before source: top-level organization, where code has landed
recently (`git log`), test placement, file-size distribution, generic modules and their
dependency direction. Then the architecture conformance protocol. Then implementation quality
against the families the target implicates. The report leads with the structural picture.

**Excerpt:**

> **Summary** · The billing module works and is structurally sound at the edges, but
> subscription state has three owners. Any lifecycle change currently requires three
> coordinated edits, and two of the three paths skip the audit log.
>
> **Architecture conformance — nominal.** `docs/adr/0004.md:12` says billing owns all
> subscription state transitions. `SubscriptionState.transition()` (src/billing/state.ts:40) is
> the intended owner; `src/api/admin/subscriptions.ts:88` and `src/jobs/expiry.ts:31` both
> assign `status` directly. The authority exists and is bypassed by two of three write paths.
>
> **What is working** · Boundary adapters confine Stripe types to `src/billing/gateway/` — no
> external type appears in the domain modules, verified by import inspection. The
> period-rounding rule has exactly one owner and table-driven tests.
>
> `1 S1 · 2 S2 · 4 S3 · 6 S4 · 2 S5`

**Note the "what is working" section.** An audit that cannot identify the load-bearing correct
parts has not understood the system, and the reader has no way to weight its criticisms.

---

## 03 · Restructure without a rewrite

**Prompt:**

> *"neatcode restructure the subscription state ownership you flagged. Don't touch the public
> API."*

**What happens.** Characterization first — the whole verb rests on it. Existing tests are run
and recorded; where behaviour is uncovered, characterization tests are written *first*, in
their own commit, pinning current behaviour including its oddities. Only then does code move.

**Excerpt:**

> **Failure** · three owners for the subscription lifecycle; two paths bypass `transition()`
> **Preserve** · all externally observable transitions, the `SubscriptionStatus` wire values,
> the admin API's response shape
> **Baseline** · 27 existing tests + 6 new characterization tests for the admin path
> **Files** · modify `state.ts`, `admin/subscriptions.ts`, `jobs/expiry.ts`; add
> `state.characterization.test.ts`. No deletions.
>
> **Behaviour comparison** · 33 of 33 baseline tests pass unchanged. One intentional deviation:
> the admin path now writes an audit record where it previously did not. That was the defect;
> `docs/adr/0004.md:12` requires it. Called out for approval.

---

## 04 · Harden something that works

**Prompt:**

> *"neatcode harden the webhook consumer in `src/webhooks`. It works but I don't trust it in
> production."*

**What happens.** The gaps are enumerated **before** anything is touched, ordered by
consequence, and presented for scope confirmation — because hardening frequently changes
observable behaviour, and that must be agreed rather than assumed.

**Excerpt:**

> **Hardening gaps** · `src/webhooks/consumer.ts` · archetype: boundary adapter
>
> 1. S1 · No deduplication; the provider delivers at least once → duplicate refunds
> 2. S2 · No timeout on the downstream call → a slow dependency exhausts the worker pool
> 3. S2 · Failure path logs nothing → duplicate refunds would be invisible
> 4. S3 · Cancellation not propagated → work continues after shutdown begins
> 5. S4 · No attempt bound → retry storm during a partial outage
>
> Which of these should I address? Items 1 and 3 change observable behaviour: a duplicate
> delivery will become a no-op, and failures will start appearing in the error stream.

---

## 05 · Build with the discipline on

**Prompt:**

> *"Add support for pausing a subscription mid-cycle without re-charging the current period."*

**What happens.** No verb needed — the default flow. Orient (read `engineering.md`, `AGENTS.md`,
manifests, architecture docs, and **the canonical path for this kind of change**), state the
contract, classify the archetype, inherit the profile, decide the structure *before* the
syntax, state a plan, implement, verify, then critique against the fifty-two gates and six
axes before claiming completion.

**Excerpt — the orientation block, which is where most of the value is:**

> **Orientation**
> · Stack: TypeScript / Node 22 / Vitest (package.json L14)
> · Instructions: AGENTS.md — "domain layer must not import from infra/" (L31)
> · Canonical path: subscription state transitions live in `src/domain/subscription.ts:88`
> · Existing capability: `applyProration()` already handles the mid-cycle case (L142)
> · Checks: `npm test` · `npm run typecheck`

That fourth line is the whole point. Without it the agent writes a second proration
calculation, and the review in recipe 00 finds it a week later.

**And the plan, before any code:**

> - **Contract** · pause a subscription mid-cycle without re-charging the current period
> - **Archetype** · stateful domain operation · **Profile** · domain-centered
> - **Files** · modify `src/domain/subscription.ts`, `src/domain/subscription.test.ts`; no new modules
> - **Structure** · extends the existing transition table; no new service layer — nothing earns one
> - **Risk** · Deep — touches billing state
> - **Evidence plan** · failing-first test for the double-charge case, plus pause-mid-cycle;
>   `npm test`, `npm run typecheck`

---

## Reading the reports

- **Provenance labels** are only in `review`, because only a change has a relationship to a
  change. `audit` has no diff to be relative to.
- **Severity is consequence-oriented.** The same construct is S1 in a payments path and S4 in a
  build script. When the context set the level, the report says so.
- **A critique score below 3 forces a revision pass**, not a caveat. If you see a 2 in a
  completion block, the run is not finished.
- **"No findings" is a complete deliverable.** A report that manufactures something to justify
  the run is how a review skill trains you to ignore it.
