# Getting Started with NeatCode

This tutorial guides you through installing NeatCode, generating your first change envelope using the CLI harness, and running an engineering review in your AI coding assistant.

---

## Prerequisites

Before starting, ensure you have:
1. **Node.js**: Version `>=20.0.0` (`node --version` to check).
2. **Git**: Installed and initialized in a local repository (`git status` works).
3. **An AI Coding Agent**: Claude Code, Cursor, Codex, or an LLM chat interface.

---

## Step 1: Install the CLI Harness

Install the `@godspeedai/neatcode` CLI globally or run it via `npx`:

```bash
npm install -g @godspeedai/neatcode
```

Verify that the CLI executable is available in your shell:

```bash
neatcode --version
```

**Expected output:**
```text
1.0.0
```

*(If you prefer not to install globally, you can execute `node path/to/bin/neatcode.mjs` directly.)*

---

## Step 2: Install the Skill in Your Agent

Install the natural language skill into your agent of choice:

### Claude Code
Install via the Claude Code plugin marketplace:
```text
/plugin marketplace add anthropics/claude-plugins-community
/plugin install @claude-community:neatcode
```
Or copy [`skills/neatcode/SKILL.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/SKILL.md) and [`skills/neatcode/references/`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/references/) into `~/.claude/skills/neatcode/`.

### Cursor
Add the contents of [`skills/neatcode/SKILL.md`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/skills/neatcode/SKILL.md) (omitting the frontmatter header) into `.cursor/rules/neatcode.mdc`.

### Codex
Copy the skill files into `~/.codex/skills/neatcode/` (for user-global scope) or `.codex/skills/neatcode/` (for project-local scope).

---

## Step 3: Discover What Your Repository Considers Proof

Navigate to any git repository containing code and run:

```bash
neatcode checks
```

**What happens:**
The harness scans your repository manifests (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Makefile`) and lists the commands the repository declares as proof of correctness.

**Example output:**
```text
npm run test	(package.json)
npm run lint	(package.json)
npm run build	(package.json)
```

---

## Step 4: Make a Change and Build the Change Envelope

Make an edit or stage some files in your repository:

```bash
git add -A
```

Now execute the harness to build the change envelope:

```bash
neatcode envelope --staged --verb review --verify "npm test"
```

**What happens:**
1. Git extracts the staged diff against `HEAD`.
2. The harness parses the diff and summarizes the change surface (+lines, −lines, touched test files).
3. The harness scans for repository instruction files (`AGENTS.md`, `CLAUDE.md`) and manifests.
4. For each modified file, the harness expands one context ring: identifying the owning package, local imported modules, discoverable callers, and related test files.
5. The harness runs `npm test` and captures the execution status and duration.
6. A structured Markdown envelope is printed to `stdout`.

---

## Step 5: Conduct the Review in Your Agent

Copy the generated Markdown envelope from your terminal into your AI coding agent, prepended with the prompt:

> *"neatcode review the staged changes."*

**What the agent does:**
1. Loads the Change Envelope and classifies the change archetype (e.g. *stateful domain operation*).
2. Traverses the 5-step reasoning sequence: **Intent $\rightarrow$ Surface $\rightarrow$ Structure $\rightarrow$ Semantics $\rightarrow$ Evidence**.
3. Checks for duplicate implementations, bypassed canonical paths, and unearned abstractions.
4. Runs the 52 pre-completion gates.
5. Scores the 6 critique axes (1–5) and returns a structured review report.

**Example Report Output:**
```markdown
**NeatCode · review** · staged · 2 files (+41 / −6) · depth: standard

**Verdict** · The fix is correct and in the canonical path. One piece of debt introduced: a second place that normalizes account numbers.

**Contract read** · Normalize account identifiers before lookup so case differences resolve identically.

#### Debt introduced (S3)
### Duplicated normalization
S3 · confirmed · introduced
`src/api/lookup.ts:88` re-implements trimming and case-folding already in `src/domain/account.ts:12`. Two owners for one invariant; they will drift on the next change.
→ Call `normalizeAccountId()` from the handler. Covered by existing `account.test.ts`.

**Evidence** · `npm test` ✓ (128 passed) · `npm run typecheck` ✓
**Critique** · correctness 4 · fit 3 · semantics 4 · restraint 5 · operations 4 · evidence 4
```

---

## Next Steps

Now that you have executed your first review:
- Learn the conceptual foundations in the [Mental Model Guide](mental-model.md).
- Explore all five verbs in the [Worked Recipes](recipes.md).
- Integrate automated envelope generation into CI via [How-To: Integrate CI](how-to/integrate-ci.md).
- Review all CLI options and flags in the [CLI Reference](reference/cli.md).
