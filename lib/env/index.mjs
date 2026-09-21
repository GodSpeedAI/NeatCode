// Environment inventory: the public entry the CLI calls.
//
// collectEnvironment() answers "what agentic and development capabilities are
// actually available on this machine and in this repository?" Every number is
// gathered by deterministic inspection; nothing here decides architecture or
// strategy — that stays in the skill, which consults this inventory during
// orientation (see skills/neatcode/references/environment.md).

import { homedir } from 'node:os';
import { discoverAgents } from './detect.mjs';
import { determineExecutor } from './executor.mjs';
import { discoverSkills } from './skills.mjs';
import { discoverServices } from './services.mjs';
import { discoverTools } from './tools.mjs';

export const ENVIRONMENT_SCHEMA_VERSION = 1;

export async function collectEnvironment({ project = null, sections = null } = {}) {
  const home = homedir();
  const want = (name) => !sections || sections.includes(name);

  let executor = { isAgent: false, name: null, via: null };
  try {
    executor = determineExecutor();
  } catch {
    // Executor detection must never fail the whole inventory.
  }

  const env = {
    schema: ENVIRONMENT_SCHEMA_VERSION,
    generated: new Date().toISOString(),
    home,
    project,
    current_executor: executor,
  };

  if (want('agents')) {
    try {
      env.agents = await discoverAgents({ home, project, executorName: executor.name });
    } catch (error) {
      env.agents = [];
      env.agents_error = error.message;
    }
  }
  if (want('skills')) {
    try {
      env.skills = discoverSkills({ home, project });
    } catch (error) {
      env.skills = null;
      env.skills_error = error.message;
    }
  }
  if (want('services')) {
    try {
      const { services, malformed } = discoverServices({ home, project });
      env.services = services;
      env.services_malformed = malformed;
    } catch (error) {
      env.services = [];
      env.services_error = error.message;
    }
  }
  if (want('tools')) {
    try {
      env.tools = discoverTools({ project });
    } catch (error) {
      env.tools = null;
      env.tools_error = error.message;
    }
  }
  return env;
}

const STATUS_MARK = { active: '✓', runnable: '✓', installed: '✓', configured: '!', candidate: '?', absent: '·' };

/** Human rendering for `neatcode environment` (default output). */
export function formatEnvironmentHuman(env) {
  const out = [];
  out.push('NeatCode Environment');
  out.push('');
  if (env.current_executor?.isAgent) {
    out.push(`Current executor: ${env.current_executor.name} (via ${env.current_executor.via})`);
  } else {
    out.push('Current executor: none detected');
  }
  out.push('');

  if (env.agents) {
    out.push('Agents');
    const visible = env.agents.filter((a) => a.status !== 'absent');
    if (!visible.length) out.push('  (none detected)');
    for (const a of visible) {
      const mark = STATUS_MARK[a.status] ?? '?';
      const active = a.evidence.currently_running ? ' · current' : '';
      out.push(`  ${mark} ${a.displayName}  ${a.status}${active}`);
      const e = a.evidence;
      if (e.executable_path) out.push(`    executable: ${e.executable_path}${e.version ? ` (${e.version})` : ''}`);
      else out.push('    executable: not found');
      if (e.config_paths.length) {
        for (const p of e.config_paths.slice(0, 3)) out.push(`    config: ${p}`);
      }
      if (e.global_skills_dir) {
        out.push(`    skills: ${e.global_skills_dir}${e.global_skills_exist ? '' : ' (missing)'}`);
      }
    }
    out.push('');
  }

  if (env.services) {
    out.push('Agent services');
    if (!env.services.length) out.push('  (none configured)');
    for (const s of env.services) {
      const clients = s.configured_by.join(', ');
      const problem =
        s.status === 'disabled' ? ' · disabled' : s.status === 'incomplete' ? ' · incomplete definition' : '';
      const unresolvable = s.transport === 'stdio' && s.executable_resolvable === false ? ' · command not resolvable' : '';
      const creds = s.credentials_present ? ` · credentials: ${s.credential_variables.join(', ') || 'present'}` : '';
      const where = s.endpoint ? ` ${s.endpoint}` : s.command ? ` ${s.command}` : '';
      out.push(`  ✓ ${s.name}  MCP · ${clients}${problem}${unresolvable}`);
      if (where.trim() || creds) out.push(`   ${where.trim()}${creds}`);
    }
    for (const m of env.services_malformed ?? []) {
      out.push(`  ! malformed config for ${m.client}: ${m.source_config}`);
    }
    out.push('');
  }

  if (env.skills) {
    out.push('Skill roots');
    if (env.skills.universal) {
      out.push(`  universal: ${env.skills.universal.path}${env.skills.universal.exists ? '' : ' (missing)'}`);
    }
    const existing = (env.skills.roots ?? []).filter((r) => r.exists).slice(0, 12);
    for (const r of existing) out.push(`  - ${r.path} (${r.scope}; ${r.usedBy.slice(0, 4).join(', ')})`);
    const missing = (env.skills.roots ?? []).filter((r) => !r.exists).length;
    if (missing) out.push(`  (${missing} supported root(s) not present)`);
    out.push('');
  }

  if (env.tools) {
    out.push('Toolchains');
    for (const t of env.tools.tools ?? []) {
      if (!t.found) continue;
      out.push(`  ✓ ${t.name}${t.version ? ` ${t.version}` : ''}`);
    }
    const missing = (env.tools.tools ?? []).filter((t) => !t.found).map((t) => t.name);
    if (missing.length) out.push(`  (missing: ${missing.join(', ')})`);
    const unrunnable = Object.entries(env.tools.engines ?? {})
      .filter(([, e]) => !e.runnable)
      .map(([name, e]) => `${name} (${e.detail})`);
    if (unrunnable.length) out.push(`  guard engines not runnable: ${unrunnable.join('; ')}`);
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}
