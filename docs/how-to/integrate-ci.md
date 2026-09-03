# How-To: Integrate NeatCode into CI / Pull Requests

This guide explains how to integrate the NeatCode harness into a CI/CD pipeline (such as GitHub Actions) to generate deterministic change envelopes for automated agent review on incoming Pull Requests.

---

## Goal
Automatically assemble a Change Envelope for every Pull Request comparing `origin/main...HEAD`, run repository tests, and attach the resulting envelope as a comment or pipeline artifact for review.

---

## Prerequisites
- A Git repository hosted on GitHub (or GitLab/Bitbucket).
- A workflow runner equipped with Node.js $\ge 20$.
- Git fetch depth configured to include the merge base.

---

## GitHub Actions Workflow Configuration

Create `.github/workflows/neatcode-envelope.yml`:

```yaml
name: NeatCode Review Envelope

on:
  pull_request:
    branches: [main]

jobs:
  envelope:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          # Fetch full history so the merge base can be computed
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Project Dependencies
        run: |
          if [ -f package-lock.json ]; then npm ci;
          elif [ -f yarn.lock ]; then yarn install --frozen-lockfile;
          elif [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile;
          else npm install;
          fi

      - name: Build Change Envelope
        run: |
          npx @godspeedai/neatcode envelope \
            --range origin/${{ github.base_ref }}...HEAD \
            --verb review \
            --intent "${{ github.event.pull_request.title }}: ${{ github.event.pull_request.body }}" \
            --verify "npm test" \
            > pr-envelope.md

      - name: Upload Change Envelope Artifact
        uses: actions/upload-artifact@v4
        with:
          name: neatcode-change-envelope
          path: pr-envelope.md

      - name: Post Envelope to PR Summary
        run: |
          cat pr-envelope.md >> $GITHUB_STEP_SUMMARY
```

---

## Why Three Dots (`...`) Instead of Two (`..`)

Notice the range specification:
```bash
--range origin/main...HEAD
```
- **Two dots (`a..b`)**: Compares all commits reachable from `HEAD` but not `origin/main`. If `main` has moved forward, two dots includes changes made on `main` that have nothing to do with this PR.
- **Three dots (`a...b`)**: Computes the **symmetric difference from the merge base**. This isolates strictly the commits introduced by the feature branch, which matches exactly what GitHub and GitLab display in PR diff views.

---

## Validation
1. Open a test Pull Request.
2. Observe the GitHub Actions workflow run.
3. Verify that the **Job Summary** displays the formatted Change Envelope table, including the change surface, morphology, context rings, and test results.
4. An automated agent or human reviewer can copy the envelope directly to conduct a review.
