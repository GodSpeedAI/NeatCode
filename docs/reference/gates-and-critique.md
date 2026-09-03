# Reference: Pre-Completion Gates and Critique Rubric

This document is the formal specification for NeatCode's 52 pre-completion gates and six-axis critique rubric ([`skills/neatcode/references/gates.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/gates.md)).

---

## 1. The 52 Pre-Completion Gates

Loaded strictly at **Step 8** of the implementation flow to audit the diff before declaring completion. **Every answer must be `no`.** A `yes` is either an immediate fix or a named finding in the completion block.

### Group A: Epistemic Integrity
1. Did I use an API, method, field, or option without confirming it exists in the installed version?
2. Did I assume a dependency's version, or a behaviour that differs across its versions?
3. Did I state a guarantee — atomicity, ordering, thread-safety, idempotency — that nothing establishes?
4. Did uncertainty become code, rather than a stated assumption?
5. Is there a comment that rationalizes uncertainty instead of resolving it (`// should be safe`, `// assuming`, `// probably`)?
6. Did I claim a file, symbol, config key, or environment variable exists without reading it?

### Group B: Behavioural Contract
7. Did behaviour change that the task did not ask to change?
8. Did I drop or weaken an invariant the previous code maintained?
9. Are there reachable edge cases I neither handled nor named — empty, zero, negative, single-element, maximum, duplicate, absent, malformed?
10. Did a public interface change without a stated compatibility story?
11. Did error semantics change silently — a thrown exception became a returned null, an error type widened, a failure became a default value?
12. Did I assume compatibility with existing callers without looking at them?
13. Does the change alter behaviour under concurrency, ordering, or partial failure without saying so?

### Group C: Repository Fit
14. Did I add behaviour without first finding where that behaviour already lives?
15. Did I duplicate a capability the repository already has?
16. Did I bypass the canonical path — a validator, a repository, a client, a transition table — and go direct?
17. Does the change violate a rule stated in `AGENTS.md`, `CONTRIBUTING.md`, an ADR, or `engineering.md`?
18. Does it invert a dependency direction the repository otherwise maintains?
19. Does it introduce an idiom — error style, naming grammar, module granularity, test shape — that conflicts with its neighbours?

### Group D: Structural Proportionality
20. Is there an abstraction, interface, layer, or indirection whose earning constraint I cannot name?
21. Is there an interface, trait, or abstract base with exactly one implementation and no demonstrated variation?
22. Is there a wrapper, manager, or service that forwards without adding policy, translation, validation, or lifecycle?
23. Did I fragment one cohesive operation across files that must now be read together?
24. Did I add a configuration option, flag, or extension point nothing currently requires?
25. Is the solution more elaborate than the problem — or, in the other direction, materially thinner than the archetype demands?

### Group E: Authority and State
26. Is any invariant now owned in more than one place?
27. Is there a second path that validates, normalizes, or transitions the same thing?
28. Did I create a parallel source of truth for data that already had one?
29. Does the change mutate state owned by another module?
30. Are state transitions explicit, or implied by the order of statements?
31. Where the change touches shared or persisted state: are atomicity, ordering, idempotency, and cancellation each either addressed or explicitly out of scope?
32. Did I add a cache, retry, or queue without stating its invalidation, safety, or ordering rule?

### Group F: Completion
33. Is there a stub, placeholder, `TODO`, `FIXME`, `NotImplemented`, or empty branch left behind?
34. Is any new code unreachable — unregistered, unexported, unrouted, uninjected, unimported?
35. Did I declare configuration, a flag, or an environment variable that no code path reads?
36. Does a migration lack a rollback path or a mixed-version story — old code reading new data, new code reading old data?
37. Is a generated artifact, schema, lockfile, or type definition now out of date with its source?
38. Does the feature work end to end, or only in the layer I touched?
39. Is there a silent fallback that hides an unfinished path — a default return, an empty list, a swallowed error?
40. Would the change pass its tests while remaining disconnected from the running system?

### Group G: Evidence
41. Did I claim any check passed that I did not actually run?
42. Could the tests I added have failed before this change?
43. Are the assertions specific enough to catch the regression they exist for?
44. Is any failure path untested where its failure would be silent?
45. Did I disable, skip, loosen, or widen anything to make the suite pass?
46. Is any statement in my output unsupported by something I read or ran?

### Group H: Change Discipline
47. Is the diff broader than the task?
48. Did I reformat, rename, or reorganize anything the task did not require?
49. Did a dependency get added, upgraded, or removed as a side effect of a feature or fix?
50. Did generated files, lockfiles, or build artifacts enter the diff without being part of the intent?
51. Did I remove behaviour without authorization?
52. Is new debt present and unnamed?

---

## 2. The Six Critique Axes

Following the gate pass, the change is evaluated on a 1–5 scale across six standardized axes:

| Axis | Score 1 (Unacceptable) | Score 3 (Passable) | Score 5 (Exemplary) |
| :--- | :--- | :--- | :--- |
| **Correctness** | Wrong on inputs it will actually see in production. | Right on the main path; edge conditions unexamined. | Right on all paths named; edges handled or explicitly constrained. |
| **Repository Fit** | Fights local conventions; opened parallel paths. | Follows local style; canonical path not confirmed. | Extends canonical path; indistinguishable from surrounding code. |
| **Semantic Integrity** | Invariants broken or unowned. | Invariants preserved by accident of structure. | Invariants named, owned once, and enforced where owned. |
| **Restraint** | Structure with no earning constraint. | Structure defensible but unexamined. | Every construct has an earning constraint; nothing inlining would improve. |
| **Operational Credibility** | Fails in production in an obvious way. | Works on happy path; failure modes unexamined. | Failure, retry, cancellation, timeouts, and metrics handled proportionate to archetype. |
| **Evidence** | Claims outrun what was actually executed. | Checks ran; coverage of the actual change unclear. | Every claim traced to a command, a read, or a labeled assumption. |

---

## The Revision Rule

> [!IMPORTANT]
> **Mandatory Threshold**: Any score below 3 on any axis **forces an automatic revision pass**. An agent cannot emit a completion block reporting a score of 1 or 2. It must repair the code, re-run verification, and re-score.
