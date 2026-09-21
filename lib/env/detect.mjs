// Installed-agent discovery: independent evidence per agent, one status.
//
// A stale config directory is not proof an executable is runnable, and a
// binary on PATH with no config is still discoverable. Each agent therefore
// gathers independent evidence — config presence, executable presence,
// version, project config, skills dirs, current-executor match — and derives
// one conservative status from it:
//
//   active     — this process runs inside the agent AND it is runnable/installed
//   runnable   — executable found on PATH (version probed when cheap)
//   installed  — upstream config-presence probe hit, but no executable found
//   configured — a config file/dir or skills dir exists, probe did not hit
//   candidate  — only project-level traces exist (the project expects it;
//                this machine shows no global evidence)
//   absent     — nothing found (omitted from human output by default)

import { existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { delimiter, join } from 'node:path';
import { loadUpstreamAgents } from './upstream-agents.mjs';
import { AGENT_KNOWLEDGE, resolvePlaceholders, templateContext } from './registry.mjs';

function normalizeName(name) {
  return (name ?? '').toLowerCase().replace(/_/g, '-');
}

/** PATH lookup without a shell: no string interpolation, no execution. */
export function findOnPath(exe, pathEnv = process.env.PATH ?? '') {
  const dirs = pathEnv.split(delimiter).filter(Boolean);
  const suffixes = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat', '.ps1'] : [''];
  for (const dir of dirs) {
    for (const suffix of suffixes) {
      const candidate = join(dir, `${exe}${suffix}`);
      try {
        const st = statSync(candidate);
        if (st.isFile()) return candidate;
      } catch {
        // Not here — keep looking.
      }
    }
  }
  return null;
}

/** Cheap version probe over argv (never a shell string). Mutates nothing. */
export function probeVersion(exePath, args = ['--version'], timeout = 10_000) {
  try {
    const run = spawnSync(exePath, args, { encoding: 'utf8', timeout });
    if (run.error || run.status !== 0) return null;
    const first = `${run.stdout ?? ''}`.split('\n').map((l) => l.trim()).filter(Boolean)[0];
    return first ? first.slice(0, 120) : null;
  } catch {
    return null;
  }
}

function existsDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Gather evidence for one agent. Pure against a fake ctx for tests:
 * ctx = { home, configHome, project, pathEnv, exists(path)->bool }.
 */
export async function collectAgentEvidence(key, { upstream, knowledge, ctx, executorName = null }) {
  const evidence = {
    known: true,
    probe_hit: false,
    config_found: false,
    config_paths: [],
    executable_found: false,
    executable_path: null,
    version: null,
    project_config_found: false,
    global_skills_dir: null,
    global_skills_exist: false,
    project_skills_dir: null,
    project_skills_exist: false,
    currently_running: false,
  };

  const exists = ctx.exists ?? existsSync;
  const tctx = templateContext({ home: ctx.home, configHome: ctx.configHome, project: ctx.project });

  // Upstream install probe (config-presence knowledge from the registry).
  // Always called: tests inject stub tables; the real table reads the real home.
  let probeHit = false;
  try {
    probeHit = await upstream.detectInstalled();
  } catch {
    probeHit = false;
  }
  evidence.probe_hit = probeHit;

  // Global skills dir from upstream (existence is evidence of configuration;
  // reported via global_skills_* fields, not duplicated into config_paths).
  if (upstream.globalSkillsDir) {
    evidence.global_skills_dir = upstream.globalSkillsDir;
    if (exists(upstream.globalSkillsDir) && existsDir(upstream.globalSkillsDir)) {
      evidence.global_skills_exist = true;
      evidence.config_found = true;
    }
  }

  // Project skills dir from upstream.
  if (ctx.project && upstream.skillsDir) {
    const projectSkills = join(ctx.project, upstream.skillsDir);
    evidence.project_skills_dir = projectSkills;
    if (exists(projectSkills) && existsDir(projectSkills)) {
      evidence.project_skills_exist = true;
      evidence.project_config_found = true;
    }
  }

  // Curated executables.
  for (const exe of knowledge?.executables ?? []) {
    const found = findOnPath(exe, ctx.pathEnv ?? process.env.PATH ?? '');
    if (found) {
      evidence.executable_found = true;
      evidence.executable_path = found;
      if (!ctx.fake) evidence.version = probeVersion(found, knowledge.versionArgs ?? ['--version']);
      break;
    }
  }

  // Curated MCP config descriptors double as config evidence.
  for (const desc of knowledge?.mcp ?? []) {
    if (desc.platform && desc.platform !== tctx.platform) continue;
    const resolved = resolvePlaceholders(desc.path, tctx);
    if (resolved.includes('{project}') && !ctx.project) continue;
    if (exists(resolved)) {
      evidence.config_found = true;
      if (!evidence.config_paths.includes(resolved)) evidence.config_paths.push(resolved);
      if (desc.scope === 'project') evidence.project_config_found = true;
    }
  }

  if (probeHit && !evidence.config_found) {
    evidence.config_found = true; // probe knows a location NeatCode does not enumerate
  }

  if (executorName && normalizeName(executorName) === normalizeName(key)) {
    evidence.currently_running = true;
  }

  return { key, displayName: upstream.displayName ?? key, evidence, status: deriveStatus(evidence) };
}

export function deriveStatus(evidence) {
  const globalEvidence = evidence.config_found || evidence.global_skills_exist;
  const projectOnly = !globalEvidence && !evidence.executable_found && evidence.project_config_found;
  if (evidence.currently_running && (evidence.executable_found || globalEvidence)) return 'active';
  if (evidence.executable_found) return 'runnable';
  if (evidence.probe_hit && !evidence.executable_found) return 'installed';
  if (globalEvidence) return 'configured';
  if (projectOnly) return 'candidate';
  return 'absent';
}

/** Discover every known agent. Returns array sorted by status rank then name. */
export async function discoverAgents({ home, configHome, project = null, executorName = null, fake = false, pathEnv = null, table = null } = {}) {
  const realHome = home ?? process.env.HOME ?? '';
  const registry = table ?? loadUpstreamAgents({ home: realHome, cwd: project ?? process.cwd() });
  const ctx = { home: realHome, configHome, project, fake, pathEnv: pathEnv ?? process.env.PATH ?? '' };
  const out = [];
  for (const [key, upstream] of Object.entries(registry)) {
    if (key === 'universal') continue;
    const knowledge = AGENT_KNOWLEDGE[key] ?? null;
    out.push(await collectAgentEvidence(key, { upstream, knowledge, ctx, executorName }));
  }
  const rank = { active: 0, runnable: 1, installed: 2, configured: 3, candidate: 4, absent: 5 };
  out.sort((a, b) => rank[a.status] - rank[b.status] || (a.key < b.key ? -1 : 1));
  return out;
}
