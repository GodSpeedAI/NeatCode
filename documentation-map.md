# NeatCode Documentation Map

This map catalogues the complete NeatCode technical knowledge system. It organizes all documentation by reader intent, Diátaxis classification, audience prerequisites, and cross-references.

---

## 1. Documentation Index

| Page | Diátaxis | Primary Audience Need | Purpose & Scope | Prerequisites | Related Pages |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`architecture.md`](architecture.md) | Explanation / Architecture | Architectural depth & structural invariants | Canonical high-level technical model, runtime topology, data flows, and subsystem boundaries. | None | [`docs/mental-model.md`](docs/mental-model.md), [`source-map.md`](source-map.md) |
| [`documentation-map.md`](documentation-map.md) | Navigation / Meta | Orientation across the knowledge system | Catalogues all pages, Diátaxis mappings, prerequisites, and relational links. | None | [`docs/README.md`](docs/README.md) |
| [`source-map.md`](source-map.md) | Reference / Traceability | Source code discovery & verification | Maps core concepts, capabilities, and schema fields directly to implementation files and line ranges. | [`architecture.md`](architecture.md) | All subsystem guides |
| [`docs/README.md`](docs/README.md) | Orientation / Portal | High-level onboarding in <5 minutes | Explains system purpose, 7 core concepts, mental model diagram, and intent-based navigation. | None | [`docs/getting-started.md`](docs/getting-started.md), [`docs/mental-model.md`](docs/mental-model.md) |
| [`docs/getting-started.md`](docs/getting-started.md) | Tutorial | Guided hands-on execution | Step-by-step setup, running the CLI harness, generating an envelope, and conducting a review. | None | [`docs/reference/cli.md`](docs/reference/cli.md), [`docs/recipes.md`](docs/recipes.md) |
| [`docs/mental-model.md`](docs/mental-model.md) | Explanation / Concept | Deep conceptual understanding | Deconstructs AI code slop, earnedness vs evidence, the harness-skill dichotomy, and context rings. | [`docs/README.md`](docs/README.md) | [`architecture.md`](architecture.md), [`docs/vocabulary.md`](docs/vocabulary.md) |
| [`docs/vocabulary.md`](docs/vocabulary.md) | Reference / Terminology | Clarification of domain terms | Defines repository terms: Change Envelope, Phenotype Conformance, Nominal Architecture, Residue, etc. | None | [`docs/mental-model.md`](docs/mental-model.md) |
| [`docs/troubleshooting.md`](docs/troubleshooting.md) | How-To / Diagnostics | Operational debugging | Diagnoses common failures: Git revision errors, untracked/dirty paths, test timeouts, Windows UNC paths. | [`docs/reference/cli.md`](docs/reference/cli.md) | [`docs/reference/envelope-schema.md`](docs/reference/envelope-schema.md) |
| **Subsystems** | | | | | |
| [`docs/subsystems/cli-and-harness.md`](docs/subsystems/cli-and-harness.md) | Reference / Architecture | Implementation details of CLI | CLI option parser, stdin piping, process exit codes, and boundary contracts in `bin/neatcode.mjs`. | [`architecture.md`](architecture.md) | [`docs/reference/cli.md`](docs/reference/cli.md) |
| [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md) | Reference / Architecture | Envelope assembly & context expansion | Deconstruction of `lib/envelope.mjs`, `diff.mjs`, `git.mjs`, `repo.mjs`, `context.mjs`, and `verify.mjs`. | [`architecture.md`](architecture.md) | [`docs/reference/envelope-schema.md`](docs/reference/envelope-schema.md) |
| [`docs/subsystems/skill-kernel.md`](docs/subsystems/skill-kernel.md) | Reference / Architecture | Natural language skill mechanics | Evaluates `SKILL.md`, verb dispatch, depth ladder, reference loading engine, and default flow. | [`docs/mental-model.md`](docs/mental-model.md) | Subsystem guides |
| [`docs/subsystems/phenotype-engine.md`](docs/subsystems/phenotype-engine.md) | Reference / Architecture | Conformance protocol mechanics | 5-step conformance verification protocol, genotype extraction, import inspection, and 6 verdicts. | [`docs/mental-model.md`](docs/mental-model.md) | [`docs/workflows/audit-workflow.md`](docs/workflows/audit-workflow.md) |
| [`docs/subsystems/taxonomy-and-gates.md`](docs/subsystems/taxonomy-and-gates.md) | Reference / Architecture | Failure categorization & quality gates | 14 failure families, 52 pre-completion gates in 8 groups, and 6-axis scoring evaluation engine. | [`docs/mental-model.md`](docs/mental-model.md) | [`docs/reference/taxonomy-catalog.md`](docs/reference/taxonomy-catalog.md) |
| **Workflows** | | | | | |
| [`docs/workflows/envelope-acquisition.md`](docs/workflows/envelope-acquisition.md) | Explanation / Workflow | End-to-end envelope creation trace | Step-by-step trace and sequence diagram for `neatcode envelope` from scope parsing to JSON/Markdown output. | [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md) | [`docs/reference/cli.md`](docs/reference/cli.md) |
| [`docs/workflows/check-discovery-run.md`](docs/workflows/check-discovery-run.md) | Explanation / Workflow | Verification discovery and execution | Execution trace of `neatcode checks` and `--verify` command execution, timeout handling, and condensing. | [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md) | [`docs/reference/cli.md`](docs/reference/cli.md) |
| [`docs/workflows/review-workflow.md`](docs/workflows/review-workflow.md) | Explanation / Workflow | Proposed change evaluation trace | Execution trace of `neatcode review` across the 5 reasoning stages and 6 provenance assignments. | [`docs/subsystems/skill-kernel.md`](docs/subsystems/skill-kernel.md) | [`docs/recipes.md`](docs/recipes.md) |
| [`docs/workflows/audit-workflow.md`](docs/workflows/audit-workflow.md) | Explanation / Workflow | Existing code assessment trace | Execution trace of `neatcode audit` across morphology, architecture conformance, and operational readiness. | [`docs/subsystems/phenotype-engine.md`](docs/subsystems/phenotype-engine.md) | [`docs/recipes.md`](docs/recipes.md) |
| [`docs/workflows/restructure-workflow.md`](docs/workflows/restructure-workflow.md) | Explanation / Workflow | Safe implementation replacement trace | Trace of `neatcode restructure` across characterization baselines, structural edits, and diff verification. | [`docs/subsystems/skill-kernel.md`](docs/subsystems/skill-kernel.md) | [`docs/recipes.md`](docs/recipes.md) |
| [`docs/workflows/study-workflow.md`](docs/workflows/study-workflow.md) | Explanation / Workflow | Engineering DNA extraction trace | Trace of `neatcode study` dating patterns via git log, authority mapping, and compiling `engineering.md`. | [`docs/subsystems/phenotype-engine.md`](docs/subsystems/phenotype-engine.md) | [`docs/study-examples.md`](docs/study-examples.md) |
| [`docs/workflows/harden-workflow.md`](docs/workflows/harden-workflow.md) | Explanation / Workflow | Operational completeness trace | Trace of `neatcode harden` evaluating the 10 production dimensions and verifying failure modes with tests. | [`docs/subsystems/taxonomy-and-gates.md`](docs/subsystems/taxonomy-and-gates.md) | [`docs/recipes.md`](docs/recipes.md) |
| **Explanation** | | | | | |
| [`docs/explanation/why-harness-skill-split.md`](docs/explanation/why-harness-skill-split.md) | Explanation / Architecture | Rationale for decoupling code & prompt | Why procedural code acquires evidence while natural language renders judgment; why AST analysis was rejected. | [`architecture.md`](architecture.md) | [`docs/mental-model.md`](docs/mental-model.md) |
| [`docs/explanation/why-zero-dependencies.md`](docs/explanation/why-zero-dependencies.md) | Explanation / Design | Supply chain restraint & portability | Explains why NeatCode has zero runtime production dependencies and uses only Node.js standard libraries. | [`architecture.md`](architecture.md) | [`docs/subsystems/cli-and-harness.md`](docs/subsystems/cli-and-harness.md) |
| [`docs/explanation/why-bounded-context.md`](docs/explanation/why-bounded-context.md) | Explanation / Theory | Attention management in LLMs | Explains context saturation risk, why whole-repo dumps degrade reasoning, and how 1-ring expansion works. | [`docs/mental-model.md`](docs/mental-model.md) | [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md) |
| [`docs/explanation/repetition-vs-intent.md`](docs/explanation/repetition-vs-intent.md) | Explanation / Theory | Invariants vs conventions vs residue | Deep exploration of the epistemic principle "repetition is not intent" and methods for dating patterns. | [`docs/mental-model.md`](docs/mental-model.md) | [`docs/workflows/study-workflow.md`](docs/workflows/study-workflow.md) |
| [`docs/explanation/nominal-architecture.md`](docs/explanation/nominal-architecture.md) | Explanation / Theory | Architectural drift & AI cosplay | Why AI coding agents frequently generate nominal architecture (architectural cosplay) and how to detect it. | [`docs/subsystems/phenotype-engine.md`](docs/subsystems/phenotype-engine.md) | [`docs/reference/taxonomy-catalog.md`](docs/reference/taxonomy-catalog.md) |
| **How-To Guides** | | | | | |
| [`docs/how-to/add-language-context.md`](docs/how-to/add-language-context.md) | How-To | Practical extension | Step-by-step procedure for adding new import regexes and source file extensions to `lib/context.mjs`. | [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md) | [`docs/reference/envelope-schema.md`](docs/reference/envelope-schema.md) |
| [`docs/how-to/add-verification-source.md`](docs/how-to/add-verification-source.md) | How-To | Practical extension | Step-by-step procedure for adding build manifest discovery and default test commands to `lib/verify.mjs`. | [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md) | [`docs/reference/cli.md`](docs/reference/cli.md) |
| [`docs/how-to/integrate-ci.md`](docs/how-to/integrate-ci.md) | How-To | CI/CD automation | Integrating `neatcode envelope` into GitHub Actions or GitLab CI to generate PR review envelopes. | [`docs/getting-started.md`](docs/getting-started.md) | [`docs/reference/cli.md`](docs/reference/cli.md) |
| [`docs/how-to/generate-engineering-md.md`](docs/how-to/generate-engineering-md.md) | How-To | Repository profiling | Extracting repository engineering DNA, tagging claims with provenance, and maintaining `engineering.md`. | [`docs/workflows/study-workflow.md`](docs/workflows/study-workflow.md) | [`docs/study-examples.md`](docs/study-examples.md) |
| **Reference** | | | | | |
| [`docs/reference/cli.md`](docs/reference/cli.md) | Reference | Formal syntax & flags | Formal specification of CLI commands (`envelope`, `checks`), flags, argument parsing, and exit codes. | None | [`docs/subsystems/cli-and-harness.md`](docs/subsystems/cli-and-harness.md) |
| [`docs/reference/envelope-schema.md`](docs/reference/envelope-schema.md) | Reference | Schema specification | Change Envelope JSON v1 specification, field definitions, type constraints, and validation rules. | None | [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md) |
| [`docs/reference/taxonomy-catalog.md`](docs/reference/taxonomy-catalog.md) | Reference | Failure taxonomy index | Comprehensive catalog of all 14 failure families with diagnostic signals, risk profiles, and exceptions. | [`docs/mental-model.md`](docs/mental-model.md) | [`docs/subsystems/taxonomy-and-gates.md`](docs/subsystems/taxonomy-and-gates.md) |
| [`docs/reference/gates-and-critique.md`](docs/reference/gates-and-critique.md) | Reference | Checklist & evaluation rubric | Exact listing of all 52 pre-completion gates across 8 groups and definition of the 6 critique axes. | None | [`docs/subsystems/taxonomy-and-gates.md`](docs/subsystems/taxonomy-and-gates.md) |

---

## 2. Reading Paths by Intent

### "I want to install it and run my first review"
1. Read [`docs/README.md`](docs/README.md) (Orientation)
2. Follow [`docs/getting-started.md`](docs/getting-started.md) (Tutorial)
3. Check [`docs/recipes.md`](docs/recipes.md) for real worked prompts
4. Reference [`docs/reference/cli.md`](docs/reference/cli.md) for flag options

### "I want to understand the architecture and how it works"
1. Read [`docs/mental-model.md`](docs/mental-model.md) (Concept)
2. Study [`architecture.md`](architecture.md) (System Architecture)
3. Explore the [Subsystems Directory](docs/subsystems)
4. Read [`docs/explanation/why-harness-skill-split.md`](docs/explanation/why-harness-skill-split.md) (Design Rationale)

### "I want to extend or modify the harness"
1. Read [`docs/subsystems/envelope-engine.md`](docs/subsystems/envelope-engine.md)
2. Follow [`docs/how-to/add-language-context.md`](docs/how-to/add-language-context.md) or [`docs/how-to/add-verification-source.md`](docs/how-to/add-verification-source.md)
3. Consult [`source-map.md`](source-map.md) for exact symbols
4. Run `npm test` to verify suite integrity

### "I am debugging an unexpected harness failure"
1. Check [`docs/troubleshooting.md`](docs/troubleshooting.md)
2. Compare outputs against [`docs/reference/envelope-schema.md`](docs/reference/envelope-schema.md)
3. Run `neatcode envelope --strict` to identify schema violations
