# NeatCode Troubleshooting Guide

This guide helps operators and maintainers diagnose and resolve errors encountered while running the NeatCode CLI harness or using the skill within an agent environment.

---

## 1. CLI Harness Failures

### Symptom: `GitError: not inside a git repository: <cwd>`
- **Cause**: The command was executed from a directory that is not part of a Git worktree, or Git cannot find a parent `.git` directory.
- **Source Location**: [`lib/git.mjs:19-23`](../lib/git.mjs#L19-L23) (`repoRoot()`).
- **Resolution**:
  - Run `git rev-parse --show-toplevel` to verify if Git recognizes the directory.
  - Initialize Git using `git init` or navigate inside the repository root before running `neatcode envelope`.

---

### Symptom: `GitError: unknown revision: <rev>`
- **Cause**: `--commit <rev>` was supplied with an invalid commit hash, branch name, or tag that Git cannot resolve.
- **Source Location**: [`lib/git.mjs:34-41`](../lib/git.mjs#L34-L41) (`resolveRev()`).
- **Resolution**:
  - Check `git rev-parse --verify <rev>` in your terminal.
  - Verify that the target commit has been fetched locally (`git fetch origin`).

---

### Symptom: `GitError: not a commit range: <range>`
- **Cause**: `--range` was invoked without a double dot (`..`) or triple dot (`...`) separator.
- **Source Location**: [`lib/git.mjs:105-113`](../lib/git.mjs#L105-L113) (`parseRange()`).
- **Resolution**:
  - For comparing against merge base (pull request simulation): use `neatcode envelope --range main...HEAD`.
  - For linear commit ranges: use `neatcode envelope --range HEAD~3..HEAD`.

---

### Symptom: `neatcode: envelope problem — diff text is present but no files parsed out of it`
- **Cause**: A diff was supplied via `--stdin` or extracted via Git, but [`lib/diff.mjs`](../lib/diff.mjs) failed to find standard `diff --git a/... b/...` headers.
- **Source Location**: [`lib/envelope.mjs:142-144`](../lib/envelope.mjs#L142-L144) (`validateEnvelope()`).
- **Resolution**:
  - Ensure the piped diff is formatted as standard unified diff text (e.g. `git diff` output, not `git status` or custom patch summaries).

---

### Symptom: `verification.ran: status: "timeout"`
- **Cause**: A verification command passed via `--verify` exceeded the default execution timeout of 15 minutes (900,000 ms).
- **Source Location**: [`lib/verify.mjs:23-34`](../lib/verify.mjs#L23-L34) (`runCheck()`).
- **Resolution**:
  - Narrow down the test command to target only the relevant test suite (e.g. `--verify "npm test -- tests/unit"` rather than full end-to-end integration suites).
  - Check if the test command is hanging on an interactive prompt or unclosed network socket.

---

### Symptom: Diff Truncated Warning (`> Truncated at 400000 of ... bytes`)
- **Cause**: The generated unified diff exceeded the default safety ceiling of 400,000 bytes (`DEFAULT_MAX_DIFF_BYTES`).
- **Source Location**: [`lib/envelope.mjs:23, 58, 89`](../lib/envelope.mjs#L23).
- **Resolution**:
  - To increase the truncation limit: pass `--max-diff-bytes <number>` (e.g., `--max-diff-bytes 1000000`).
  - Better discipline: Narrow the scope using `--paths` or stage smaller, coherent logical commits.

---

## 2. Cross-Platform & Environment Issues

### Symptom: Windows Path Separators / UNC Path Assertion Failures
- **Cause**: When running on Windows or WSL over UNC shares (`\\wsl.localhost\...`), Node's `path.relative()` produces backslashes (`\`), whereas repository sets and URL targets expect forward slashes (`/`).
- **Diagnostic Code**: Check tests or scripts doing path comparisons without `.split('\\').join('/')`.
- **Resolution**:
  - Normalize relative paths in tooling scripts:
    ```javascript
    const normalized = relative(root, file).split('\\').join('/');
    ```

### Symptom: Git CRLF / LF Warnings
- **Cause**: Git core setting `core.autocrlf` is active in Windows/WSL environments during fixture initialization.
- **Resolution**:
  - These warnings do not cause test or harness failures; Git automatically normalizes line endings during diff parsing.

---

## 3. Agent & Skill Execution Failures

### Symptom: Agent Generates Superficial or Hallucinated Review
- **Cause**: The model context window was overwhelmed with raw repository code or run on a weak model.
- **Resolution**:
  - Run the skill using your strongest reasoning model (Claude 3.5 Sonnet, Claude 3.7 Sonnet, GPT-4o, etc.). Weak models pattern-match against the patch rather than reasoning across the change envelope.
  - Rely on the envelope's context pointers rather than dumping complete repository directories into the agent chat.

### Symptom: Critique Scores Always Report 5
- **Cause**: The agent is being sycophantic or skipping the 52 pre-completion gates.
- **Resolution**:
  - Explicitly prompt the agent: *"Apply the pre-completion gates from gates.md strictly. Score the critique honestly; a score below 3 requires a revision pass."*
