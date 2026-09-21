// Skills-directory discovery: which skill roots exist, who shares them.
//
// The universal `.agents/skills` location is shared by many agents; it must
// be reported once with all its users, not counted as N independent copies.
// Agent-specific project and global roots come from the upstream registry.

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { loadUpstreamAgents } from './upstream-agents.mjs';

function existsDir(path, exists) {
  try {
    if (exists && !exists(path)) return false;
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * @param {object} options { home, project, exists(path)->bool }
 * Returns { universal, roots }: universal is the shared project root (or
 * null); roots is a deduplicated list of { path, scope, exists, usedBy[] }.
 */
export function discoverSkills({ home, project = null, exists = null } = {}) {
  const table = loadUpstreamAgents({ home, cwd: project ?? process.cwd() });
  const byPath = new Map();
  const add = (path, scope, usedBy) => {
    const entry = byPath.get(path) ?? { path, scope, exists: false, usedBy: [] };
    if (!entry.usedBy.includes(usedBy)) entry.usedBy.push(usedBy);
    // A path seen as both project and global keeps the broader scope label.
    if (entry.scope !== scope && (scope === 'global' || entry.scope === 'project')) {
      entry.scope = scope === 'global' && entry.scope === 'project' ? 'project+global' : entry.scope;
      if (scope === 'project' && entry.scope === 'global') entry.scope = 'project+global';
    }
    byPath.set(path, entry);
  };

  let universal = null;
  if (project) {
    universal = join(project, '.agents', 'skills');
    add(universal, 'project', 'universal (.agents/skills)');
  }

  for (const [key, agent] of Object.entries(table)) {
    if (key === 'universal') continue;
    if (project && agent.skillsDir) {
      const p = join(project, agent.skillsDir);
      if (p !== universal) add(p, 'project', key);
      else {
        const entry = byPath.get(p);
        if (entry && !entry.usedBy.includes(key)) entry.usedBy.push(key);
      }
    }
    if (agent.globalSkillsDir) add(agent.globalSkillsDir, 'global', key);
  }

  const roots = [...byPath.values()].map((r) => ({
    ...r,
    usedBy: [...r.usedBy].sort(),
    exists: existsDir(r.path, exists),
  }));
  roots.sort((a, b) => (a.path < b.path ? -1 : 1));
  return {
    universal: universal ? { path: universal, exists: existsDir(universal, exists) } : null,
    roots,
  };
}
