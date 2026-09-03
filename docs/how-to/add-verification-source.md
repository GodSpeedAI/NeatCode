# How-To: Add a Verification Source to Check Discovery

This guide explains how to extend `neatcode checks` and the change envelope's verification discovery engine in [`lib/verify.mjs`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/lib/verify.mjs) to automatically detect proof commands for a new language, build tool, or framework.

---

## Goal
Enable NeatCode to inspect a repository's manifests (e.g. `gradle.build`, `mix.exs`, `pom.xml`, or `Package.swift`) and automatically discover the default test and verification commands declared by that project.

---

## Prerequisites
- Node.js $\ge 20$.
- Understanding of the build manifest file format and its standard test execution invocation.

---

## Procedure

### Step 1: Open `lib/verify.mjs`
Locate [`discoverChecks(root)`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/lib/verify.mjs#L56-L89):

```javascript
export function discoverChecks(root) {
  const found = [];
  const add = (source, command) => found.push({ source, command });

  // Manifest probes live here...
```

### Step 2: Implement the Manifest Probe
Add an `existsSync` check and parse the manifest if necessary. Always wrap file reads in `try/catch` to ensure that an unparseable manifest does not crash discovery:

```javascript
  // Example: Adding Elixir / Mix support
  if (existsSync(join(root, 'mix.exs'))) {
    add('mix.exs', 'mix test');
  }

  // Example: Adding Gradle support
  if (existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'))) {
    add('build.gradle', './gradlew check');
  }
```

### Step 3: Register Manifest in `lib/repo.mjs`
Ensure that the manifest filename is also listed in `MANIFESTS` in [`lib/repo.mjs:10-15`](file:///wsl.localhost/Ubuntu-26.04/home/sprime01/projects/NeatCode/lib/repo.mjs#L10-L15):
```javascript
const MANIFESTS = [
  'package.json', 'deno.json', 'deno.jsonc', 'jsr.json',
  'Cargo.toml', 'go.mod', 'pyproject.toml', 'setup.py', 'requirements.txt',
  'Gemfile', 'composer.json', 'pom.xml', 'build.gradle', 'build.gradle.kts',
  'mix.exs', 'pubspec.yaml', 'Package.swift', 'CMakeLists.txt',
];
```
This ensures that `owningPackage()` and repository morphology correctly detect package boundaries around files governed by this manifest.

---

## Validation

1. Run the CLI in a repository containing the target manifest:
   ```bash
   neatcode checks
   ```
2. Verify that your new command appears in the output:
   ```text
   mix test	(mix.exs)
   ```
3. Run the automated test suite to ensure no regressions:
   ```bash
   npm test
   ```

---

## Common Failure Symptoms
- **Command does not show up in `neatcode checks`**: The manifest file path check was relative to `process.cwd()` instead of `root`. Always use `join(root, 'manifest.file')`.
- **JSON parse error crashes the harness**: If reading a manifest (e.g. JSON or TOML), a syntax error in the target repo's manifest must not crash NeatCode. Ensure all parsing logic is inside a `try/catch` block.
