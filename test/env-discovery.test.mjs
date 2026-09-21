// Environment discovery: agent evidence statuses, executor signals,
// skills-dir deduplication, and toolchain bounds.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { collectAgentEvidence, deriveStatus, discoverAgents } from '../lib/env/detect.mjs';
import { determineExecutor, evaluateCondition } from '../lib/env/executor.mjs';
import { discoverSkills } from '../lib/env/skills.mjs';
import { discoverTools } from '../lib/env/tools.mjs';

async function withHome(structure, fn) {
  const home = mkdtempSync(join(tmpdir(), 'neatcode-home-'));
  const project = mkdtempSync(join(tmpdir(), 'neatcode-proj-'));
  try {
    for (const [rel, content] of Object.entries(structure.home ?? {})) {
      const abs = join(home, rel);
      if (content === 'DIR') mkdirSync(abs, { recursive: true });
      else {
        mkdirSync(join(abs, '..'), { recursive: true });
        writeFileSync(abs, content);
      }
    }
    for (const [rel, content] of Object.entries(structure.project ?? {})) {
      const abs = join(project, rel);
      if (content === 'DIR') mkdirSync(abs, { recursive: true });
      else {
        mkdirSync(join(abs, '..'), { recursive: true });
        writeFileSync(abs, content);
      }
    }
    return await fn(home, project);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
}

const stubUpstream = (overrides = {}) => ({
  displayName: 'Stub',
  skillsDir: '.stub/skills',
  globalSkillsDir: null,
  detectInstalled: async () => false,
  ...overrides,
});

const ctxFor = (home, project) => ({
  home,
  configHome: join(home, '.config'),
  project,
  fake: true,
  pathEnv: '',
  exists: (p) => existsSync(p),
});

test('config-only agent is configured; executable-only is runnable', async (t) => {
  await withHome({ home: { '.stub/skills': 'DIR' } }, async (home, project) => {
    const ctx = ctxFor(home, project);
    const upstream = stubUpstream({ globalSkillsDir: join(home, '.stub/skills') });
    // Probe hits, no executable: installed.
    const installed = await collectAgentEvidence('stub', {
      upstream: stubUpstream({
        globalSkillsDir: join(home, '.stub/skills'),
        detectInstalled: async () => true,
      }),
      knowledge: null,
      ctx,
    });
    t.assert.equal(installed.status, 'installed');

    // Config trace without probe: configured.
    const configured = await collectAgentEvidence('stub', {
      upstream,
      knowledge: null,
      ctx,
    });
    t.assert.equal(configured.status, 'configured');
    t.assert.equal(configured.evidence.config_found, true);
  });
});

test('executable on PATH is runnable even without config', async (t) => {
  await withHome({}, async (home, project) => {
    const binDir = join(home, 'bin');
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, 'stub-agent'), '#!/bin/sh\necho stub 1.0\n');
    const ctx = {
      ...ctxFor(home, project),
      pathEnv: [binDir, ...(process.env.PATH ?? '').split(delimiter)].join(delimiter),
      exists: () => false,
    };
    const r = await collectAgentEvidence('stub', {
      upstream: stubUpstream(),
      knowledge: { executables: ['stub-agent'], versionArgs: ['--version'], mcp: [] },
      ctx,
    });
    t.assert.equal(r.evidence.executable_found, true);
    t.assert.ok(r.evidence.executable_path.endsWith('stub-agent'));
    t.assert.equal(r.status, 'runnable');
  });
});

test('project-only traces are candidates, not installations', async (t) => {
  await withHome({ project: { '.stub/skills': 'DIR' } }, async (home, project) => {
    const r = await collectAgentEvidence('stub', {
      upstream: stubUpstream(),
      knowledge: null,
      ctx: ctxFor(home, project),
    });
    t.assert.equal(r.evidence.project_config_found, true);
    t.assert.equal(r.status, 'candidate');
  });
});

test('legacy config paths and env overrides resolve', async (t) => {
  const { resolvePlaceholders, templateContext } = await import('../lib/env/registry.mjs');
  const ctx = templateContext({ home: '/h', configHome: '/h/.config', project: '/p' });
  t.assert.equal(resolvePlaceholders('{codexHome}/config.toml', ctx), '/h/.codex/config.toml');
  t.assert.equal(resolvePlaceholders('{project}/.mcp.json', ctx), '/p/.mcp.json');
  t.assert.equal(resolvePlaceholders('{unknown}/x', ctx), '{unknown}/x');
});

test('status derivation matrix', (t) => {
  const base = {
    known: true, probe_hit: false, config_found: false, config_paths: [],
    executable_found: false, executable_path: null, version: null,
    project_config_found: false, global_skills_exist: false, currently_running: false,
  };
  t.assert.equal(deriveStatus(base), 'absent');
  t.assert.equal(deriveStatus({ ...base, executable_found: true }), 'runnable');
  t.assert.equal(deriveStatus({ ...base, probe_hit: true }), 'installed');
  t.assert.equal(deriveStatus({ ...base, config_found: true }), 'configured');
  t.assert.equal(deriveStatus({ ...base, project_config_found: true }), 'candidate');
  t.assert.equal(
    deriveStatus({ ...base, executable_found: true, currently_running: true }),
    'active',
  );
  // Running inside an agent with no local evidence is not "active".
  t.assert.equal(deriveStatus({ ...base, currently_running: true }), 'absent');
});

test('executor: AI_AGENT wins; signals match in order; unknown env is quiet', (t) => {
  const spec = {
    aiAgentVar: 'AI_AGENT',
    agents: [
      { key: 'A', name: 'agent-a', match: { type: 'env_set', name: 'AGENT_A_MARKER' } },
      { key: 'B', name: 'agent-b', match: { type: 'env_value', name: 'AGENT_MODE', value: 'b' } },
    ],
  };
  t.assert.deepEqual(determineExecutor({ env: { AI_AGENT: ' custom ' }, spec }), {
    isAgent: true, name: 'custom', via: 'AI_AGENT',
  });
  t.assert.deepEqual(determineExecutor({ env: { AGENT_A_MARKER: '1' }, spec }), {
    isAgent: true, name: 'agent-a', via: 'signal',
  });
  t.assert.deepEqual(determineExecutor({ env: {}, spec }), { isAgent: false, name: null, via: null });
  // Malformed patterns and unknown condition types never throw.
  t.assert.equal(evaluateCondition({ type: 'env_matches', name: 'X', pattern: '([' }, { X: 'y' }), false);
  t.assert.equal(evaluateCondition({ type: 'nope' }, {}), false);
});

test('universal skills dir is deduplicated across agents', (t) => {
  const skills = discoverSkills({ home: '/nonexistent-home-xyz', project: '/nonexistent-proj-xyz' });
  t.assert.ok(skills.universal?.path.endsWith(join('.agents', 'skills')));
  const universal = skills.roots.filter((r) => r.path === skills.universal.path);
  t.assert.equal(universal.length, 1, 'one shared entry, not one per agent');
  t.assert.ok(universal[0].usedBy.length > 1, 'shared entry names all users');
});

test('toolchains report found/missing honestly without running state', (t) => {
  const { tools, engines } = discoverTools({ project: null });
  const node = tools.find((tool) => tool.name === 'node');
  t.assert.equal(node.found, true, 'node runs the harness, so node must be found');
  t.assert.ok(node.version, 'node version probed');
  for (const tool of tools) {
    t.assert.equal(typeof tool.found, 'boolean');
    if (!tool.found) t.assert.equal(tool.path, null);
  }
  t.assert.equal(engines['neatcode/js-ts'].runnable, true);
  t.assert.equal(typeof engines['anti_slop/python'].runnable, 'boolean');
});

test('upstream registry port carries the full agent table', async (t) => {
  const { loadUpstreamAgents } = await import('../lib/env/upstream-agents.mjs');
  const table = loadUpstreamAgents({ home: '/x', cwd: '/y' });
  const keys = Object.keys(table).filter((k) => k !== 'universal');
  t.assert.ok(keys.length >= 70, `expected ~79 agents, got ${keys.length}`);
  for (const must of ['claude-code', 'codex', 'opencode', 'cursor', 'cline', 'gemini-cli']) {
    t.assert.ok(table[must], `registry missing ${must}`);
    t.assert.ok(table[must].skillsDir, `${must} needs a project skills dir`);
  }
});

test('full agent discovery returns every known agent exactly once', async (t) => {
  const table = {
    'stub-a': stubUpstream({ displayName: 'Stub A' }),
    'stub-b': stubUpstream({ displayName: 'Stub B', detectInstalled: async () => true }),
  };
  const agents = await discoverAgents({
    home: '/nonexistent-home-xyz',
    project: null,
    fake: true,
    pathEnv: '',
    table,
  });
  t.assert.equal(agents.length, 2);
  t.assert.equal(new Set(agents.map((a) => a.key)).size, 2);
  t.assert.deepEqual(
    Object.fromEntries(agents.map((a) => [a.key, a.status])),
    { 'stub-a': 'absent', 'stub-b': 'installed' },
  );
});
