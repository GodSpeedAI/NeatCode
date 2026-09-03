# Reference: Failure Taxonomy Catalog

This catalog outlines NeatCode's 14 failure families. Every defect in generated software can be traced back to a failure of **Earnedness** ([`references/restraint.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/restraint.md)) or **Evidence** ([`references/evidence.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/evidence.md)).

---

## 1. Epistemic Integrity
- **Core Defect**: Coding through uncertainty; inventing APIs, types, or environment variables without confirming their existence in the installed version.
- **Signals**: Fabricated method signatures, guessing parameter order, comments rationalizing uncertainty (`// should work`, `// probably safe`).
- **Immediate Risk**: Runtime crash (`NoSuchMethodError`, `TypeError`) upon reaching the unverified path.
- **Legitimate Exceptions**: Mocking an external service in a test fixture where the contract is deliberately simulated.
- **Correction**: Read the installed manifest and source definition before coding; or state the assumption explicitly at the top of the output.
- **Reference**: [`skills/neatcode/references/taxonomy/epistemic.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/epistemic.md)

---

## 2. Context
- **Core Defect**: Locally plausible, globally wrong. Implementing a duplicate capability or bypassing the canonical authority because the agent did not search the codebase first.
- **Signals**: A second `normalizeEmail()` or `hashPassword()` added to an endpoint handler when a canonical utility already exists in `domain/`.
- **Immediate Risk**: Two divergent authorities answering the same question.
- **Correction**: Search the repository for existing capability before writing; call the canonical path.
- **Reference**: [`skills/neatcode/references/taxonomy/context.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/context.md)

---

## 3. Contract
- **Core Defect**: Inadvertent breaking of public behavior, dropping invariants, or altering error semantics without agreement.
- **Signals**: Changing a returned `null` to a thrown exception, altering status codes, dropping boundary assertions.
- **Immediate Risk**: Upstream callers break unexpectedly in production.
- **Correction**: Preserve public signatures; add explicit migration windows if contracts must change.
- **Reference**: [`skills/neatcode/references/taxonomy/contract.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/contract.md)

---

## 4. Completion
- **Core Defect**: Shipping the outward appearance of finished software while leaving core paths unwired or stubbed.
- **Signals**: Leftover `TODO` or `FIXME` comments, empty `catch` blocks, configuration keys that no code path reads, features missing route registration.
- **Immediate Risk**: Silent failures, dead code paths, false sense of readiness.
- **Correction**: Wire end-to-end (route, export, DI container); remove stubs or explicitly narrow scope.
- **Reference**: [`skills/neatcode/references/taxonomy/completion.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/completion.md)

---

## 5. Abstraction
- **Core Defect**: Unearned indirection, premature generality, and architectural ceremony.
- **Signals**: Interfaces with exactly one implementation, classes ending in `*Manager` or `*Helper` that merely forward calls, factories constructing a single type.
- **Immediate Risk**: High cognitive load, fragmented call stacks, difficult debugging.
- **Correction**: Run the removal test: inline the class/method; if nothing gets worse, remove the abstraction.
- **Reference**: [`skills/neatcode/references/taxonomy/abstraction.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/abstraction.md)

---

## 6. Authority
- **Core Defect**: Fragmented ownership of state transitions or business invariants.
- **Signals**: A status field modified directly at three different call sites instead of passing through an authorized transition function.
- **Immediate Risk**: Inconsistent state, missed audit logs, corrupted records.
- **Correction**: Route all mutations through a single authoritative function or state machine.
- **Reference**: [`skills/neatcode/references/taxonomy/authority.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/authority.md)

---

## 7. Boundary
- **Core Defect**: Layer violations and foreign type leakage across module boundaries.
- **Signals**: Core domain entities importing third-party SDK types (e.g. Stripe, AWS SDK) or database ORM models.
- **Immediate Risk**: Upgrading an external library forces changes across the core business domain.
- **Correction**: Introduce boundary adapters that translate foreign wire types into domain types at the boundary.
- **Reference**: [`skills/neatcode/references/taxonomy/boundary.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/boundary.md)

---

## 8. State and Concurrency
- **Core Defect**: Race conditions, non-atomic read-modify-write operations, missing idempotency keys.
- **Signals**: Applying retry logic to a payment capture or email dispatch without an idempotency key; check-then-act operations on shared memory.
- **Immediate Risk**: Double charges, duplicate records, corrupted counters under load.
- **Correction**: Database-level unique constraints, idempotency keys on external API calls, atomic updates.
- **Reference**: [`skills/neatcode/references/taxonomy/state-and-concurrency.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/state-and-concurrency.md)

---

## 9. Failure Handling
- **Core Defect**: Swallowing exceptions, catching broad errors, returning misleading defaults.
- **Signals**: `catch (e) {}` with no logging, returning `false` on a database timeout (masquerading an operational outage as "not found").
- **Immediate Risk**: Invisible production outages, unrecoverable data states.
- **Correction**: Fail closed; preserve stack traces; log contextual metadata with correlation IDs.
- **Reference**: [`skills/neatcode/references/taxonomy/failure-handling.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/failure-handling.md)

---

## 10. Tests
- **Core Defect**: Tautological tests, implementation mirroring, happy-path-only coverage.
- **Signals**: Test assertions that assert mock return values (`expect(mock.call).toBe(true)`), tests that pass before and after a bug is introduced, missing edge cases.
- **Immediate Risk**: High test coverage percentage with zero regression safety.
- **Correction**: Write failing-first tests; assert observable behavior rather than implementation details.
- **Reference**: [`skills/neatcode/references/taxonomy/tests.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/tests.md)

---

## 11. Observability
- **Core Defect**: Silent operations and uninstrumented failure paths.
- **Signals**: Background jobs running without duration metrics, errors logged without entity IDs or request correlation IDs.
- **Immediate Risk**: Inability for operators to diagnose incidents or trace user sessions.
- **Correction**: Attach correlation IDs to all logs; increment failure counters on catch blocks.
- **Reference**: [`skills/neatcode/references/taxonomy/observability.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/observability.md)

---

## 12. Security
- **Core Defect**: Insecure defaults, missing authorization checks, untrusted input crossing boundaries.
- **Signals**: Checking user authentication (logged in) but omitting object authorization (owns resource); string-interpolated SQL/commands.
- **Immediate Risk**: Unauthorized data access, command injection, privilege escalation.
- **Correction**: Validate input at the boundary; check permissions on the target resource; use parameterized queries.
- **Reference**: [`skills/neatcode/references/taxonomy/security.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/security.md)

---

## 13. Change Discipline
- **Core Defect**: Scope creep, gratuitous reformatting, hidden dependency upgrades.
- **Signals**: A 1,000-line diff for a 2-line bug fix; re-indenting unaffected files; updating `package.json` dependencies alongside a feature.
- **Immediate Risk**: Unreviewable diffs, unbisectable Git history, accidental regressions.
- **Correction**: Revert unrelated formatting; isolate dependency updates into separate PRs.
- **Reference**: [`skills/neatcode/references/taxonomy/change-discipline.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/change-discipline.md)

---

## 14. Maintainability Theater
- **Core Defect**: Superficial ceremony that mimics engineering without adding value.
- **Signals**: Comments stating the obvious (`// increment i by 1`), taxonomic naming sprawl (`UserEntityDTOModel`), docs restating code.
- **Immediate Risk**: Developer fatigue, cognitive clutter, docs drifting out of sync.
- **Correction**: Comments must explain *why*, not *what*; delete ceremonial wrappers.
- **Reference**: [`skills/neatcode/references/taxonomy/maintainability-theater.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/taxonomy/maintainability-theater.md)
