# NeatCode Source Map

This document establishes concrete, line-traceable connections between architectural concepts, user-facing capabilities, and the source code artifacts that implement them.

---

## 1. CLI and Execution Entry Points

| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| CLI Entrypoint | [`bin/neatcode.mjs:1-9`](bin/neatcode.mjs#L1-L9) | Shebang & ESM imports | Shell executable entry point. |
| CLI Argument Parsing | [`bin/neatcode.mjs`](bin/neatcode.mjs) | `parseArgs(argv)` | Custom, zero-dependency flag tokenizer supporting scope modes, options, verbs, guard flags, and environment flags. |
| Positional Flag Validator | [`bin/neatcode.mjs`](bin/neatcode.mjs) | `need(rest, flag)` | Ensures values follow options requiring arguments. |
| Stdin Diff Reader | [`bin/neatcode.mjs`](bin/neatcode.mjs) | `readStdin()` | Synchronously buffers piped unified diffs from stdin descriptor `0`. |
| CLI Main Controller | [`bin/neatcode.mjs`](bin/neatcode.mjs) | `main(argv)` | Routes `envelope` vs `checks` vs `guard` vs `environment`, handles `--json`, `--strict`, and sets exit codes. |
| Guard Command Runner | [`bin/neatcode.mjs`](bin/neatcode.mjs) | `runGuardCommand(opts)` | Validates languages, resolves baseline/diff source, emits guard results. |
| Environment Command Runner | [`bin/neatcode.mjs`](bin/neatcode.mjs) | `runEnvironmentCommand(opts)` | Resolves project root, collects and emits the capability inventory. |

---

## 2. Evidence Harness Subsystems (`lib/`)

### Envelope Engine (`lib/envelope.mjs`)
| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| Envelope Version | [`lib/envelope.mjs:17`](lib/envelope.mjs#L17) | `ENVELOPE_VERSION` | Constant (`1`) defining the schema revision. |
| Supported Scopes | [`lib/envelope.mjs:19-21`](lib/envelope.mjs#L19-L21) | `SCOPE_MODES` | `Set` of allowed scope identifiers. |
| Envelope Builder | [`lib/envelope.mjs:33-112`](lib/envelope.mjs#L33-L112) | `buildEnvelope(options)` | Central orchestrator assembling scope, change, repository, context, and verification. |
| Envelope Validator | [`lib/envelope.mjs:118-159`](lib/envelope.mjs#L118-L159) | `validateEnvelope(envelope)` | Structural integrity assertion engine returning array of error strings. |
| Markdown Serializer | [`lib/envelope.mjs:165-250`](lib/envelope.mjs#L165-L250) | `toMarkdown(envelope)` | Human- and agent-readable Markdown formatter for change envelopes. |

### Git Interaction (`lib/git.mjs`)
| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| Error Boundary | [`lib/git.mjs:8`](lib/git.mjs#L8) | `GitError` | Custom error class for Git subprocess failures. |
| Safe Git Runner | [`lib/git.mjs:10-17`](lib/git.mjs#L10-L17) | `git(args, options)` | `spawnSync` wrapper using argv arrays to prevent shell injection. |
| Repository Root Resolver | [`lib/git.mjs:19-23`](lib/git.mjs#L19-L23) | `repoRoot(cwd)` | Locates repository root via `git rev-parse --show-toplevel`. |
| Revision Resolver | [`lib/git.mjs:34-41`](lib/git.mjs#L34-L41) | `resolveRev(rev, cwd)` | Resolves Git ref or revision to a full commit SHA. |
| Diff Acquisition | [`lib/git.mjs:64-103`](lib/git.mjs#L64-L103) | `acquireDiff(source, options)` | Dispatches diff acquisition across working-tree, staged, commit, and ranges. |
| Range Parser | [`lib/git.mjs:105-113`](lib/git.mjs#L105-L113) | `parseRange(range)` | Differentiates two-dot (`..`) vs three-dot (`...`) symmetric branch ranges. |
| Tracked Files Listing | [`lib/git.mjs:116-119`](lib/git.mjs#L116-L119) | `trackedFiles(cwd)` | NUL-delimited list of all tracked repository paths (`git ls-files -z`). |
| Working Tree Status | [`lib/git.mjs:122-136`](lib/git.mjs#L122-L136) | `workingTreeStatus(cwd)` | Porcelain status parser detecting uncommitted or untracked changes. |
| Baseline File Reader | [`lib/git.mjs`](lib/git.mjs) | `showFile(rev, path, cwd)` | File content at a revision (or null); feeds guard baseline scans. |

### Diff and Path Morphology (`lib/diff.mjs`)
| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| File Classification | [`lib/diff.mjs:22-29`](lib/diff.mjs#L22-L29) | `classifyPath(path)` | Categorizes paths into `generated`, `test`, `asset`, `docs`, `config`, or `source`. |
| Git Header Parsing | [`lib/diff.mjs:45-51`](lib/diff.mjs#L45-L51) | `splitGitHeader(line)` | Handles paths containing spaces and unquotes Git escape sequences. |
| Unified Diff Parser | [`lib/diff.mjs:57-139`](lib/diff.mjs#L57-L139) | `parseDiff(text)` | Extracts structured file entries, hunks, line additions, and deletions. |
| Change Discipline Signals | [`lib/diff.mjs:142-162`](lib/diff.mjs#L142-L162) | `summarizeChange(parsed)` | Computes directory dispersion, test touches, and generated file touches. |

### Repository Morphology (`lib/repo.mjs`)
| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| Tree Morphology | [`lib/repo.mjs:32-53`](lib/repo.mjs#L32-L53) | `readTree(root, options)` | Groups tracked files by directory up to depth 3; counts kinds. |
| Size Outliers | [`lib/repo.mjs:67-81`](lib/repo.mjs#L67-L81) | `sizeOutliers(root, options)` | Detects god modules and oversized non-generated files. |
| Manifest Discovery | [`lib/repo.mjs:93-99`](lib/repo.mjs#L93-L99) | `findManifests(root, options)` | Discovers build manifests (`package.json`, `Cargo.toml`, etc.). |
| Instruction Discovery | [`lib/repo.mjs:101-107`](lib/repo.mjs#L101-L107) | `findInstructions(root)` | Locates `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, etc. |
| Architecture Docs | [`lib/repo.mjs:109-115`](lib/repo.mjs#L109-L115) | `findArchitectureDocs(root)` | Finds `README.md`, `ARCHITECTURE.md`, ADRs, and RFCs. |
| Workspace Detection | [`lib/repo.mjs:117-126`](lib/repo.mjs#L117-L126) | `detectWorkspace(root)` | Determines monorepo markers and package counts. |
| Owning Package | [`lib/repo.mjs:129-142`](lib/repo.mjs#L129-L142) | `owningPackage(root, filePath)` | Traverses upward to find enclosing manifest for a changed file. |

### Context Rings (`lib/context.mjs`)
| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| Local Import Scanner | [`lib/context.mjs:40-62`](lib/context.mjs#L40-L62) | `localImports(root, path)` | Regex scan of imports in JS, TS, Python, Rust, Go, C++, etc. |
| Caller Heuristic | [`lib/context.mjs:79-93`](lib/context.mjs#L79-L93) | `likelyCallers(root, path)` | Textual regex search for module stem across source files. |
| Related Test Finder | [`lib/context.mjs:96-104`](lib/context.mjs#L96-L104) | `relatedTests(root, path)` | Matches colocated or mirrored test files by module name. |
| Context Ring Expansion | [`lib/context.mjs:110-127`](lib/context.mjs#L110-L127) | `expandContext(root, paths)` | Expands 1 ring per changed path into package, imports, callers, tests. |

### Verification Capture (`lib/verify.mjs`)
| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| Single Check Runner | [`lib/verify.mjs:23-46`](lib/verify.mjs#L23-L46) | `runCheck(command, options)` | Executes command with timeout, captures exit code, duration, and output. |
| Output Condenser | [`lib/verify.mjs:10-16`](lib/verify.mjs#L10-L16) | `condense(text)` | Condenses verbose logs to head/tail summary with elision indicator. |
| Check Discovery | [`lib/verify.mjs:56-89`](lib/verify.mjs#L56-L89) | `discoverChecks(root)` | Probes `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`. |

---

## 2b. Deterministic Guard Subsystem (`lib/guards/`, `guards/`)

| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| Guard Taxonomy | [`lib/guards/taxonomy.mjs`](lib/guards/taxonomy.mjs) | `FAMILIES` | Language-independent finding families; one concept, one authority. |
| Finding Model | [`lib/guards/model.mjs`](lib/guards/model.mjs) | `makeFinding`, `validateFinding`, `summarizeFindings` | Unified result contract with upstream provenance. |
| File Discovery & Routing | [`lib/guards/dispatch.mjs`](lib/guards/dispatch.mjs) | `collectGuardFiles`, `analyzeCollected` | Extension routing, generated/vendored exclusions, per-language execution. |
| Baseline Classification | [`lib/guards/diffclass.mjs`](lib/guards/diffclass.mjs) | `classifyFindings` | Labels findings introduced/worsened/exposed/pre-existing/resolved. |
| Guard Orchestration | [`lib/guards/index.mjs`](lib/guards/index.mjs) | `runGuards`, `formatGuardsHuman` | Public entry for the CLI and the envelope; human/JSON rendering. |
| JS/TS Detectors | [`lib/guards/javascript.mjs`](lib/guards/javascript.mjs) | `analyzeJavaScript` | Syntactic detectors adapted from `guards/js-ts/upstream/`. |
| Python Engine Adapter | [`lib/guards/python.mjs`](lib/guards/python.mjs) | `analyzePythonFiles` | Executes vendored `anti_slop` via system python3; normalizes JSON. |
| Go Detectors | [`lib/guards/go.mjs`](lib/guards/go.mjs) | `analyzeGo` | Syntactic detectors adapted from `guards/go/upstream/` (G01–G08, G10, G11, G13). |
| Rust Policy | [`lib/guards/rust.mjs`](lib/guards/rust.mjs) | `analyzeRust` | Nine NeatCode-owned rules; see `guards/rust/UPSTREAM.md`. |
| Masked-Source Scanning | [`lib/guards/scan.mjs`](lib/guards/scan.mjs) | `maskSource`, `functionRanges` | Comment/string masking preserving positions; approximate function ranges. |

## 2c. Environment Inventory Subsystem (`lib/env/`)

| Capability / Concept | Source Artifact | Symbol / Function | Description |
| :--- | :--- | :--- | :--- |
| Inventory Orchestration | [`lib/env/index.mjs`](lib/env/index.mjs) | `collectEnvironment`, `formatEnvironmentHuman` | Public entry for the CLI; section selection; human/JSON rendering. |
| Agent Discovery | [`lib/env/detect.mjs`](lib/env/detect.mjs) | `discoverAgents`, `deriveStatus` | Independent evidence per agent; absent→active status derivation. |
| Current Executor | [`lib/env/executor.mjs`](lib/env/executor.mjs) | `determineExecutor` | Env-signal detection from the vendored `detect-agents.json` spec. |
| Agent Knowledge | [`lib/env/registry.mjs`](lib/env/registry.mjs) | `AGENT_KNOWLEDGE` | Curated executables and MCP locations over the upstream registry. |
| Upstream Registry Port | [`lib/env/upstream-agents.mjs`](lib/env/upstream-agents.mjs) | `loadUpstreamAgents` | Mechanical port of `upstream/agents.registry.ts` (79 agents). |
| MCP Services | [`lib/env/services.mjs`](lib/env/services.mjs) | `discoverServices`, `parseTomlSubset` | Config parsing, normalization, dedup, redaction. |
| Skill Roots | [`lib/env/skills.mjs`](lib/env/skills.mjs) | `discoverSkills` | Universal + agent-specific roots with shared-location dedup. |
| Toolchains | [`lib/env/tools.mjs`](lib/env/tools.mjs) | `discoverTools` | Runtime probes, guard-engine runnability, declared checks. |
| Secret Redaction | [`lib/env/redact.mjs`](lib/env/redact.mjs) | `redactConfig`, `redactScalar` | Single authority for secret handling; values never leave. |

---

## 3. Skill Kernel and Natural Language References (`skills/neatcode/`)

| Skill Component | File Path | Key Sections | Purpose |
| :--- | :--- | :--- | :--- |
| Skill Kernel | [`skills/neatcode/SKILL.md`](skills/neatcode/SKILL.md) | Disciplines, Depth ladder, 9-step flow, Verb dispatch | Central instructions orchestrating the agent's reasoning. |
| Restraint & Earnedness | [`skills/neatcode/references/restraint.md`](skills/neatcode/references/restraint.md) | Earnedness test, Complexity budget, Removal test | Core principle: what concrete constraint earns this complexity? |
| Evidence Discipline | [`skills/neatcode/references/evidence.md`](skills/neatcode/references/evidence.md) | 3 states (Verified, Inspected, Assumed), Honest close | Prevents unverified claims and testing tautologies. |
| Reasoning Sequence | [`skills/neatcode/references/reasoning.md`](skills/neatcode/references/reasoning.md) | Intent $\rightarrow$ Surface $\rightarrow$ Structure $\rightarrow$ Semantics $\rightarrow$ Evidence | 5-stage sequential reasoning protocol. |
| Finding Model | [`skills/neatcode/references/findings.md`](skills/neatcode/references/findings.md) | S1–S5 Severity, Confidence, 6 Provenance labels | Standardized defect reporting structure. |
| Gates & Critique | [`skills/neatcode/references/gates.md`](skills/neatcode/references/gates.md) | 52 gates (Groups A–H), 6-axis critique rubric | Pre-completion checklist and scoring. |
| Archetypes | [`skills/neatcode/references/archetypes.md`](skills/neatcode/references/archetypes.md) | 11 change archetypes | Determines which rules bind hardest based on change nature. |
| Profiles | [`skills/neatcode/references/profiles.md`](skills/neatcode/references/profiles.md) | 7 engineering profiles | Defines the trade-off set inherited from surrounding code. |
| Phenotype Conformance | [`skills/neatcode/references/architecture/phenotype.md`](skills/neatcode/references/architecture/phenotype.md) | 5 steps, 6 conformance verdicts | Assesses claimed architecture vs expressed structure. |
| Architectural Signatures | [`skills/neatcode/references/architecture/signatures.md`](skills/neatcode/references/architecture/signatures.md) | Layered, Hexagonal, Pipeline, Monolith signatures | Diagnostic checks for specific architectural styles. |
| Untrusted Input | [`skills/neatcode/references/untrusted-input.md`](skills/neatcode/references/untrusted-input.md) | Prompt injection defense, Secret handling | Treats repository text as untrusted evidence, not instruction. |
| Engineering Artifact | [`skills/neatcode/references/engineering-md.md`](skills/neatcode/references/engineering-md.md) | Provenance tags (`explicit`, `observed`, etc.) | Structure and authoring rules for `engineering.md`. |
| Failure Taxonomy | [`skills/neatcode/references/taxonomy.md`](skills/neatcode/references/taxonomy.md) | Fast routing table, 14 families | Index and routing table for named failure modes. |
| Deterministic Guards | [`skills/neatcode/references/guards.md`](skills/neatcode/references/guards.md) | Baseline/diff-scoped runs, finding judgment | When to run guards and how to judge a finding. |
| Ecosystem Overlays | [`skills/neatcode/references/ecosystems/`](skills/neatcode/references/ecosystems/typescript.md) | Per-language consequence guidance (typescript, python, go, rust) | Turns a guard finding into a repository judgment at critique time. |
| Environment Inventory | [`skills/neatcode/references/environment.md`](skills/neatcode/references/environment.md) | Orientation use, status reading, earnedness | Consulting local capability without mandating it. |

---

## 4. Test Suite and Verification (`test/`)

| Test File | Target Under Test | Key Invariants Verified |
| :--- | :--- | :--- |
| [`test/diff.test.mjs`](test/diff.test.mjs) | `lib/diff.mjs` | Unified diff parsing, hunk calculation, line additions/deletions, path classification, change summaries. |
| [`test/envelope.test.mjs`](test/envelope.test.mjs) | `lib/envelope.mjs`, `bin/neatcode.mjs` | Multi-scope envelope creation (`staged`, `commit`, `range`, `paths`), validation rules, check recording, CLI stdout (Markdown/JSON). |
| [`test/skill-integrity.test.mjs`](test/skill-integrity.test.mjs) | Repository & Skill Integrity | Package metadata, link graph resolution, reference reachability from `SKILL.md`, CLI flags matching documented commands, 6 critique axes exact matching. |
| [`test/guards-javascript.test.mjs`](test/guards-javascript.test.mjs) | `lib/guards/javascript.mjs` | Ported JS/TS rule contracts: positives, near-neighbor negatives, position stability. |
| [`test/guards-python.test.mjs`](test/guards-python.test.mjs) | `lib/guards/python.mjs` | Vendored engine delegation: normalization, family mapping, failure honesty. |
| [`test/guards-go.test.mjs`](test/guards-go.test.mjs) | `lib/guards/go.mjs` | Ported Go rule contracts (G01–G08, G10, G11, G13) with justification exemptions. |
| [`test/guards-rust.test.mjs`](test/guards-rust.test.mjs) | `lib/guards/rust.mjs` | Every NeatCode-owned Rust rule: violation plus legitimate near-neighbor. |
| [`test/guards-orchestration.test.mjs`](test/guards-orchestration.test.mjs) | `lib/guards/` orchestration | Mixed-language runs, exclusions, JSON stability, introduced vs pre-existing. |
| [`test/env-discovery.test.mjs`](test/env-discovery.test.mjs) | `lib/env/detect.mjs`, `executor.mjs`, `skills.mjs` | Agent evidence statuses, executor signals, skills dedup. |
| [`test/env-services.test.mjs`](test/env-services.test.mjs) | `lib/env/services.mjs`, `redact.mjs` | Multi-client dedup, scopes, transports, malformed configs, secret redaction. |
